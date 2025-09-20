#!/usr/bin/env bash
set -euo pipefail

# start-demo-ngrok.sh
# Starts the demo server (npm start) and an ngrok tunnel to expose it publicly.
# Usage: NGROK_AUTH_TOKEN=your_token ./scripts/start-demo-ngrok.sh

PORT=${PORT:-8081}
NGROK_REGION=${NGROK_REGION:-us}

function check_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command '$1' not found. Please install it." >&2
    exit 1
  fi
}

check_command npm
check_command ngrok
check_command curl
check_command jq || echo "Warning: 'jq' not found — script will still run but won't parse ngrok API output automatically"

if [[ -n "${NGROK_AUTH_TOKEN:-}" ]]; then
  echo "Configuring ngrok authtoken..."
  ngrok config add-authtoken "$NGROK_AUTH_TOKEN" >/dev/null 2>&1 || true
fi

echo "Starting demo server (background) on port $PORT..."
pushd "$(dirname "$0")/.." >/dev/null
npm start > .demo-server.log 2>&1 &
DEV_PID=$!
popd >/dev/null

sleep 1

echo "Starting ngrok tunnel for port $PORT (region=$NGROK_REGION)..."
ngrok http "$PORT" --region="$NGROK_REGION" --log=stdout > ../.demo-ngrok.out 2>&1 &
NGROK_PID=$!

echo "Waiting for ngrok to initialize..."
for i in $(seq 1 15); do
  sleep 1
  if curl -s http://127.0.0.1:4040/api/tunnels >/dev/null 2>&1; then
    PUB=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null || true)
    if [[ -n "$PUB" && "$PUB" != "null" ]]; then
      echo "ngrok public URL: $PUB"
      echo "Demo server PID: $DEV_PID" > ../.demo-ngrok.meta
      echo "ngrok PID: $NGROK_PID" >> ../.demo-ngrok.meta
      echo "Logs: demo-server/.demo-server.log, demo-server/.demo-ngrok.out"
      echo "To stop: demo-server/scripts/stop-demo-ngrok.sh"
      exit 0
    fi
  fi
done

echo "Failed to detect ngrok URL. Check demo-server/.demo-ngrok.out and demo-server/.demo-server.log"
exit 1
