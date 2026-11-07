#!/bin/bash
# Keeps phreox-space.jar current: fetch, start, and look for a newer release every PHREOX_UPDATE_INTERVAL_SECONDS (default 600).
# When one is installed the node is stopped (it finishes its requests) and started again with the new jar.
set -uo pipefail

cd /app
export PHREOX_ARTIFACT=space
interval="${PHREOX_UPDATE_INTERVAL_SECONDS:-600}"
java_options="${PHREOX_JAVA_OPTS:--XX:+UseZGC -XX:MaxRAMPercentage=70 -XX:+ExitOnOutOfMemoryError}"

./update.sh || true

if [[ ! -f phreox-space.jar ]]; then
  echo "No phreox-space release has been published yet, trying again in $interval seconds"
  sleep "$interval"
  exec "$0"
fi

# shellcheck disable=SC2086
java $java_options -jar phreox-space.jar &
node=$!

# A stop of the container ends the node cleanly.
trap 'kill "$node" 2>/dev/null; wait "$node"; exit 0' TERM INT

while kill -0 "$node" 2>/dev/null; do
  sleep "$interval" &
  wait $! || true

  if ./update.sh | tee /dev/stderr | grep -q '^Installed '; then
    echo "A newer release is installed, restarting the node"
    kill "$node" 2>/dev/null
    wait "$node" 2>/dev/null
    exec "$0"
  fi
done

# The node ended by itself: the container restarts it (restart: unless-stopped).
wait "$node"
