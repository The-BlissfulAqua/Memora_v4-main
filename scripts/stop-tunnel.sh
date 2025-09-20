#!/usr/bin/env bash
set -euo pipefail

# stop-tunnel.sh
# Stops ngrok and the dev server started by start-tunnel.sh if their PIDs were recorded.

NGROK_PID_FILE=".ngrok.pid"
META_FILE=".ngrok.meta"

if [[ -f "$NGROK_PID_FILE" ]]; then
  NGROK_PID=$(cat "$NGROK_PID_FILE" || echo "")
  if [[ -n "$NGROK_PID" ]]; then
    echo "Killing ngrok (PID $NGROK_PID)"
    kill "$NGROK_PID" 2>/dev/null || true
    rm -f "$NGROK_PID_FILE"
  fi
fi

if [[ -f "$META_FILE" ]]; then
  DEV_PID=$(awk 'NR==1{print $3}' "$META_FILE" || true)
  # The metadata file format may vary; try to extract numbers
  PIDS=$(grep -oE '[0-9]+' "$META_FILE" || true)
  for p in $PIDS; do
    echo "Killing process $p"
    kill "$p" 2>/dev/null || true
  done
  rm -f "$META_FILE"
fi

echo "Removed ngrok/dev metadata files. Check .ngrok.out and .ngrok-dev.log for logs."
