#!/usr/bin/env python3
"""Package a built Space JAR and self-hosting launchers into a distributable ZIP."""
import argparse
import hashlib
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--jar", type=Path, default=root / "phreox-space/target/phreox-space.jar")
parser.add_argument("--output", type=Path, default=root / "dist/phreox-space-selfhost.zip")
args = parser.parse_args()
if not args.jar.is_file():
    parser.error("Build the server first with mvn -pl phreox-space -am -DskipTests package")
files = {path.name: path for path in (root / "distribution/space").iterdir() if path.is_file()}
files["phreox-space.jar"] = args.jar
files["egg-phreox-space.json"] = root / "pterodactyl/egg-phreox-space.json"
args.output.parent.mkdir(parents=True, exist_ok=True)
checksums = []
with zipfile.ZipFile(args.output, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
    for name, path in sorted(files.items()):
        data = path.read_bytes()
        if name.endswith(".bat"):
            data = data.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
        entry = zipfile.ZipInfo(name)
        entry.external_attr = (0o100755 if name.endswith(".sh") else 0o100644) << 16
        entry.compress_type = zipfile.ZIP_DEFLATED
        bundle.writestr(entry, data)
        checksums.append(f"{hashlib.sha256(data).hexdigest()}  {name}")
    bundle.writestr("SHA256SUMS", "\n".join(checksums) + "\n")
print(args.output)
