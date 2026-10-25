// Builds phreox-presence in release mode and copies the binary to
// resources/bin, where the app finds it in development and where a packaged
// app ships it.

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const crate = path.resolve(here, "..", "..", "phreox-presence");
const outDir = path.resolve(here, "..", "resources", "bin");
const exe = process.platform === "win32" ? "phreox-presence.exe" : "phreox-presence";

const build = spawnSync("cargo", ["build", "--release"], {
  cwd: crate,
  stdio: "inherit",
  shell: process.platform === "win32",
});

if (build.status !== 0) {
  console.error("[bundle-presence] cargo build failed");
  process.exit(build.status ?? 1);
}

mkdirSync(outDir, { recursive: true });
copyFileSync(path.join(crate, "target", "release", exe), path.join(outDir, exe));

console.log(`[bundle-presence] ${path.join(outDir, exe)}`);
