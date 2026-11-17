#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"
java_bin="${JAVA_HOME:+$JAVA_HOME/bin/}java"
command -v "$java_bin" >/dev/null || { echo 'Java 25 is required. Set JAVA_HOME or install Java 25.' >&2; exit 1; }
[[ -f phreox-space.jar ]] || { echo 'Missing phreox-space.jar.' >&2; exit 1; }
export PHREOX_SPACE_CONFIG="${PHREOX_SPACE_CONFIG:-$PWD/space.properties}"
read -r -a java_options <<< "${PHREOX_JAVA_OPTS:--XX:+UseZGC -XX:MaxRAMPercentage=70 -XX:+ExitOnOutOfMemoryError}"
exec "$java_bin" "${java_options[@]}" -jar phreox-space.jar "$@"
