#!/bin/bash
# Installation of the egg "Phreox Service". Puts the newest release of the channel into the server directory, so that the first
# start is quick. From then on the supervisor (talk.phreox.service.supervisor.Supervisor, inside that jar) keeps it current.
set -euo pipefail

API="${PHREOX_UPDATE_API:-https://api.github.com}"
REPO="${PHREOX_UPDATE_REPO:-Phreox/releases}"
CHANNEL="${PHREOX_UPDATE_CHANNEL:-release}"
TOKEN="${PHREOX_UPDATE_TOKEN:-}"

cd /mnt/server
mkdir -p app run data

auth=()
if [[ -n "$TOKEN" ]]; then auth=(-H "Authorization: Bearer $TOKEN"); fi

# Which tags belong to the channel; the newest one that matches is taken (the API lists the newest first).
case "$CHANNEL" in
  release) pattern='^[0-9]+\.[0-9]+\.[0-9]+$' ;;
  beta)    pattern='^[0-9]+\.[0-9]+\.[0-9]+-(beta|pre|rc)\.[0-9]+$' ;;
  alpha)   pattern='^[0-9]+\.[0-9]+\.[0-9]+-(alpha|pre\.alpha)\.[0-9]+$' ;;
  dev)     pattern='^[0-9]+\.[0-9]+\.[0-9]+-dev\.[0-9a-f]{8}$' ;;
  *) echo "Unknown channel '$CHANNEL' (release, beta, alpha or dev)"; exit 1 ;;
esac

echo "Looking for the newest $CHANNEL release of $REPO"
releases="$(curl -fsSL "${auth[@]}" -H "Accept: application/vnd.github+json" "$API/repos/$REPO/releases?per_page=30")"

tag="$(jq -r --arg p "$pattern" --arg c "$CHANNEL" '[.[] | select(.draft == false and (.tag_name | test($p)))][0].tag_name // empty' <<<"$releases")"

if [[ -z "$tag" ]]; then
  echo "No $CHANNEL release exists yet. The server will wait for one when it starts."
  exit 0
fi

asset_name="phreox-service-$CHANNEL-$tag.jar"
asset_url="$(jq -r --arg t "$tag" --arg n "$asset_name" '.[] | select(.tag_name == $t) | .assets[] | select(.name == $n) | .url' <<<"$releases")"
sums_url="$(jq -r --arg t "$tag" '.[] | select(.tag_name == $t) | .assets[] | select(.name == "SHA256SUMS") | .url' <<<"$releases")"

if [[ -z "$asset_url" || -z "$sums_url" ]]; then
  echo "Release $tag has no $asset_name or no SHA256SUMS, the server will install a later one itself."
  exit 0
fi

mkdir -p "app/$tag"
echo "Downloading $asset_name"
curl -fsSL "${auth[@]}" -H "Accept: application/octet-stream" -o "app/$tag/phreox-service.jar.part" "$asset_url"
curl -fsSL "${auth[@]}" -H "Accept: application/octet-stream" -o SHA256SUMS "$sums_url"

expected="$(grep -E "[ *]$asset_name\$" SHA256SUMS | awk '{print $1}')"
actual="$(sha256sum "app/$tag/phreox-service.jar.part" | awk '{print $1}')"
rm -f SHA256SUMS

if [[ -z "$expected" || "$expected" != "$actual" ]]; then
  rm -f "app/$tag/phreox-service.jar.part"
  echo "The checksum of $asset_name does not match, nothing installed."
  exit 1
fi

mv "app/$tag/phreox-service.jar.part" "app/$tag/phreox-service.jar"
printf '%s' "$tag" > app/current
cp "app/$tag/phreox-service.jar" supervisor.jar
echo "Installed $tag"
