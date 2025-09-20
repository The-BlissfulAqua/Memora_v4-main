#!/usr/bin/env bash
set -euo pipefail

# start-tunnel.sh
# Small helper to run the local dev server and expose it via ngrok.
# Usage:
#   NGROK_AUTH_TOKEN=your_token ./scripts/start-tunnel.sh
# or set NGROK_AUTH_TOKEN in your environment and run without args.

### Configuration
# PORT: the local port to expose (default: 5173 for Vite)
# NGROK_AUTH_TOKEN: your ngrok authtoken (required if ngrok is not already authed)
# NGROK_REGION: optional region (e.g., us, eu, ap). Default: us

PORT=${PORT:-5173}
NGROK_REGION=${NGROK_REGION:-us}

echo "Starting dev server on port $PORT and exposing it with ngrok (region=$NGROK_REGION)"

function check_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Required command '$1' not found in PATH. Please install it and try again." >&2
    exit 1
  fi
}

check_command pnpm
check_command ngrok

# If NGROK_AUTH_TOKEN provided, ensure ngrok is authed
if [[ -n "${NGROK_AUTH_TOKEN:-}" ]]; then
  echo "Configuring ngrok authtoken..."
  ngrok config add-authtoken "$NGROK_AUTH_TOKEN" >/dev/null 2>&1 || true
fi

echo "Launching dev server (background)..."
# Start dev server in background, redirect output to a logfile
LOGFILE=".ngrok-dev.log"
pnpm run dev > "$LOGFILE" 2>&1 &
DEV_PID=$!

sleep 1

echo "Starting ngrok tunnel..."
# Start ngrok in HTTP mode pointing at $PORT and printing json output so we can parse the public URL
NGROK_PID_FILE=".ngrok.pid"
ngrok http "$PORT" --region="$NGROK_REGION" --log=stdout > .ngrok.out 2>&1 &
NGROK_PID=$!
echo $NGROK_PID > "$NGROK_PID_FILE"

echo "Waiting for ngrok to initialize (this may take a few seconds)..."
for i in $(seq 1 15); do
  sleep 1
  # Try to detect public URL from the ngrok local API (if available)
  if curl -s http://127.0.0.1:4040/api/tunnels >/dev/null 2>&1; then
    PUB=$(curl -s http://127.0.0.1:4040/api/tunnels | jq -r '.tunnels[0].public_url' 2>/dev/null || true)
    if [[ -n "$PUB" && "$PUB" != "null" ]]; then
      echo "ngrok tunnel established: $PUB"
      echo "Dev server PID: $DEV_PID" > .ngrok.meta
      echo "ngrok PID: $NGROK_PID" >> .ngrok.meta
      echo "Logfile: $LOGFILE, ngrok output: .ngrok.out"
      echo
      echo "To stop: kill $NGROK_PID $DEV_PID or run ./scripts/stop-tunnel.sh"
      exit 0
    fi
  fi
done

echo "Failed to detect ngrok public URL within timeout. Check .ngrok.out and $LOGFILE for details."
echo "ngrok PID: $NGROK_PID, dev server PID: $DEV_PID"
exit 1
