#!/bin/bash
# Runs the server of an egg and keeps it up to date: bash run.sh '<start command>'
#
# It updates once (update.sh), starts the command, and then looks for a new release every PHREOX_UPDATE_SECONDS (30). When one has been
# installed it stops the server (SIGTERM, then SIGKILL after 30 seconds) and starts it again with the new version, so nobody has to press
# restart in the panel. A server that ends by itself ends this script with the same exit code, so the panel sees a crash as a crash.
# PHREOX_UPDATE_SECONDS=0 turns the looking off. A failed look keeps the running version.
set -uo pipefail

cd "$(dirname "$0")"

interval="${PHREOX_UPDATE_SECONDS:-30}"

# The panel's images start the egg's command through `env`, which knows no shell syntax (no quotes, no `exec`, no assignments in front of
# a program), so the egg only says which artifact to run (bash run.sh space) and the command lives here. The single quotes keep the
# variables for the shell that starts the server, where the panel's variables and SERVER_PORT exist.
# A first argument that is not an artifact is still taken as the whole command, as the older eggs gave it.
case "${1:-${PHREOX_ARTIFACT:-}}" in
  backend) artifact=backend; command='PHREOX_BRIDGE_PORT=${SERVER_PORT} PHREOX_DATA_DIR=/home/container/data exec java ${PHREOX_JAVA_OPTS} -jar phreox-backend.jar' ;;
  space)   artifact=space;   command='PHREOX_SPACE_HOST=0.0.0.0 PHREOX_SPACE_PORT=${SERVER_PORT} PHREOX_SPACE_DATA_DIR=/home/container/data exec java ${PHREOX_JAVA_OPTS} -jar phreox-space.jar' ;;
  web)     artifact=web;     command='exec node web/server.mjs' ;;
  website) artifact=website; command='PHREOX_SITE_VERSION=$(cat app/current 2>/dev/null) exec node web/server.mjs' ;;
  *)       artifact="${PHREOX_ARTIFACT:-}"; command="$*" ;;
esac
export PHREOX_ARTIFACT="$artifact"
child=0
stopping=0

forward() {
  stopping=1

  if [[ "$child" -ne 0 ]]; then
    kill -TERM "$child" 2>/dev/null
    wait "$child" 2>/dev/null
  fi

  exit 0
}
trap forward INT TERM

version() { cat app/current 2>/dev/null || true; }

# The first look is the update the egg always did before a start; its messages are of interest.
bash update.sh || true

while true; do
  running="$(version)"
  echo "[phreox] starting ${running:-without a release}"
  # What is typed into the console of the panel goes to the server (the space server has commands). A job in the background reads
  # nothing unless it is told where from.
  bash -c "$command" <&0 &
  child=$!

  restart=0

  while kill -0 "$child" 2>/dev/null; do
    if [[ "$interval" -le 0 ]]; then wait "$child" 2>/dev/null; break; fi

    # Waiting in the background lets the trap react at once to a stop of the panel.
    sleep "$interval" &
    wait $! 2>/dev/null
    kill -0 "$child" 2>/dev/null || break

    PHREOX_UPDATE_QUIET=1 bash update.sh || true

    if [[ "$(version)" != "$running" ]]; then
      echo "[phreox] new release $(version), restarting"
      restart=1
      kill -TERM "$child" 2>/dev/null

      # The server finishes its requests; one that does not stop is ended.
      for _ in $(seq 1 30); do kill -0 "$child" 2>/dev/null || break; sleep 1; done
      kill -KILL "$child" 2>/dev/null || true
      break
    fi
  done

  wait "$child" 2>/dev/null
  code=$?

  if [[ "$restart" -eq 1 ]]; then continue; fi
  if [[ "$stopping" -eq 1 ]]; then exit 0; fi

  echo "[phreox] the server ended with exit code $code"
  exit "$code"
done
