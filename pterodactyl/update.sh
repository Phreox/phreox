#!/bin/bash
# Brings the server of an egg to the newest release of its channel. Runs at installation and before every start, so a restart of
# the server in the panel is an update. PHREOX_ARTIFACT says what is fetched: "backend" or "space" (phreox-backend-<channel>-<version>.jar,
# kept as phreox-backend.jar), "web" (phreox-web-<channel>-<version>.tar.gz, unpacked to web/) or "website" (phreox-website-<version>.tar.gz of the
# release tag website-<version>, unpacked to web/; the website has no channels of its own). A failure keeps what is installed.
# run.sh calls it again every 30 seconds; PHREOX_UPDATE_QUIET=1 keeps it silent unless something is installed or goes wrong. A look that finds
# nothing new costs no request of the rate limit of GitHub (it is a conditional request, answered with 304).
set -uo pipefail

cd "$(dirname "$0")"

API="${PHREOX_UPDATE_API:-https://api.github.com}"
REPO="${PHREOX_UPDATE_REPO:-Phreox/releases}"
CHANNEL="${PHREOX_UPDATE_CHANNEL:-release}"
TOKEN="${PHREOX_UPDATE_TOKEN:-}"
ARTIFACT="${PHREOX_ARTIFACT:?PHREOX_ARTIFACT is missing}"

case "$ARTIFACT" in
  backend) extension=jar ;;
  space)   extension=jar ;;
  web)     extension=tar.gz ;;
  website) extension=tar.gz ;;
  *) echo "Unknown artifact '$ARTIFACT'"; exit 1 ;;
esac

case "$CHANNEL" in
  release) pattern='^[0-9]+\.[0-9]+\.[0-9]+$' ;;
  beta)    pattern='^[0-9]+\.[0-9]+\.[0-9]+-(beta|pre|rc)\.[0-9]+$' ;;
  alpha)   pattern='^[0-9]+\.[0-9]+\.[0-9]+-(alpha|pre\.alpha)\.[0-9]+$' ;;
  dev)     pattern='^[0-9]+\.[0-9]+\.[0-9]+-dev\.[0-9a-f]{8}$' ;;
  *) echo "Unknown channel '$CHANNEL' (release, beta, alpha or dev)"; exit 1 ;;
esac

# The runtime images do not all have jq: take a static one next to the server when it is missing.
if ! command -v jq >/dev/null 2>&1; then
  if [[ ! -x ./jq ]]; then
    arch="$(uname -m)"; [[ "$arch" == "x86_64" ]] && arch=amd64; [[ "$arch" == "aarch64" ]] && arch=arm64
    curl -fsSL -o ./jq "https://github.com/jqlang/jq/releases/latest/download/jq-linux-$arch" && chmod +x ./jq || { echo "No jq, keeping the installed version"; exit 0; }
  fi
  jq() { ./jq "$@"; }
fi

auth=()
if [[ -n "$TOKEN" ]]; then auth=(-H "Authorization: Bearer $TOKEN"); fi

say() { if [[ -z "${PHREOX_UPDATE_QUIET:-}" ]]; then echo "$@"; fi; }

mkdir -p app

# What was seen the last time everything went well: the ETag of the list, for this channel and artifact. A list that has not changed since is
# answered with 304 and costs nothing of the rate limit, so checking every 30 seconds is fine even without a token.
key="$CHANNEL|$ARTIFACT"
etag=""
if [[ -f app/current && "$(sed -n 1p app/etag 2>/dev/null)" == "$key" ]]; then etag="$(sed -n 2p app/etag)"; fi

status="$(curl -sSL -o app/releases.json -D app/headers -w '%{http_code}' "${auth[@]}" ${etag:+-H "If-None-Match: $etag"} -H "Accept: application/vnd.github+json" "$API/repos/$REPO/releases?per_page=30")" || status=0
new_etag="$(grep -i '^etag:' app/headers 2>/dev/null | tail -1 | sed 's/^[^:]*: *//' | tr -d '\r')"

if [[ "$status" == "304" ]]; then rm -f app/releases.json app/headers; exit 0; fi
if [[ "$status" != "200" ]]; then rm -f app/releases.json app/headers; echo "Releases cannot be read (HTTP $status), keeping the installed version"; exit 0; fi

releases="$(cat app/releases.json)"
rm -f app/releases.json app/headers

# Everything about this list is dealt with: the next look may ask whether it changed.
settle() { if [[ -n "$new_etag" ]]; then printf '%s\n%s\n' "$key" "$new_etag" > app/etag; fi; }

# The website is released on its own, with tags website-1.2.3 that no app or service takes for a release of theirs.
if [[ "$ARTIFACT" == "website" ]]; then pattern='^website-[0-9]+\.[0-9]+\.[0-9]+$'; fi

tag="$(jq -r --arg p "$pattern" '[.[] | select(.draft == false and (.tag_name | test($p)))][0].tag_name // empty' <<<"$releases")"

if [[ -z "$tag" ]]; then say "No $CHANNEL release exists yet"; settle; exit 0; fi
if [[ "$(cat app/current 2>/dev/null)" == "$tag" ]]; then say "Up to date: $tag"; settle; exit 0; fi

asset_name="phreox-$ARTIFACT-$CHANNEL-$tag.$extension"
if [[ "$ARTIFACT" == "website" ]]; then asset_name="phreox-website-${tag#website-}.tar.gz"; fi
asset_url="$(jq -r --arg t "$tag" --arg n "$asset_name" '.[] | select(.tag_name == $t) | .assets[] | select(.name == $n and .state == "uploaded") | .url' <<<"$releases")"
sums_url="$(jq -r --arg t "$tag" '.[] | select(.tag_name == $t) | .assets[] | select(.name == "SHA256SUMS" and .state == "uploaded") | .url' <<<"$releases")"

if [[ -z "$asset_url" || -z "$sums_url" ]]; then echo "Release $tag has no $asset_name or no SHA256SUMS, keeping the installed version"; exit 0; fi

echo "Downloading $asset_name"
curl -fsSL "${auth[@]}" -H "Accept: application/octet-stream" -o app/download.part "$asset_url" || { rm -f app/download.part; echo "Download failed"; exit 0; }
curl -fsSL "${auth[@]}" -H "Accept: application/octet-stream" -o app/SHA256SUMS "$sums_url" || { rm -f app/download.part; echo "Checksums missing"; exit 0; }

expected="$(grep -E "[ *]$asset_name\$" app/SHA256SUMS | awk '{print $1}')"
actual="$(sha256sum app/download.part | awk '{print $1}')"
rm -f app/SHA256SUMS

if [[ -z "$expected" || "$expected" != "$actual" ]]; then
  rm -f app/download.part
  echo "The checksum of $asset_name does not match, nothing installed."
  exit 1
fi

if [[ "$ARTIFACT" == "backend" || "$ARTIFACT" == "space" ]]; then
  mv app/download.part "phreox-$ARTIFACT.jar"
else
  rm -rf web.next && mkdir web.next
  tar -xzf app/download.part -C web.next || { rm -rf web.next app/download.part; echo "Archive cannot be unpacked"; exit 1; }
  rm -f app/download.part
  rm -rf web && mv web.next web
fi

printf '%s' "$tag" > app/current
settle
echo "Installed $tag"
