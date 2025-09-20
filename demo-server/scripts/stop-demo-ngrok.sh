#!/usr/bin/env bash
set -euo pipefail

# stop-demo-ngrok.sh
# Stops the demo server and ngrok started by start-demo-ngrok.sh

META_FILE="../.demo-ngrok.meta"
OUT_FILE=".demo-ngrok.out"

pushd "$(dirname "$0")" >/dev/null
if [[ -f "$META_FILE" ]]; then
  echo "Killing processes listed in $META_FILE"
  for p in $(grep -oE '[0-9]+' "$META_FILE"); do
    echo "Killing $p"; kill "$p" 2>/dev/null || true
  done
  rm -f "$META_FILE"
fi

if [[ -f "$OUT_FILE" ]]; then
  echo "Ngrok output: $OUT_FILE"
fi
popd >/dev/null

echo "Stopped demo server and ngrok (best-effort)."
