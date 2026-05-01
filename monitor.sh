#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="/home/yc-user/backend-api"
HEALTH_URL="http://127.0.0.1:3000/health"
LOG_FILE="$HOME/monitor.log"
API_CONTAINER="rusyugtrans-api"

timestamp="$(date -Is)"

if curl -fsS --max-time 5 "$HEALTH_URL" >/dev/null; then
  echo "$timestamp OK $HEALTH_URL" >> "$LOG_FILE"
  exit 0
fi

echo "$timestamp FAIL $HEALTH_URL, restarting $API_CONTAINER" >> "$LOG_FILE"

cd "$PROJECT_DIR"
docker restart "$API_CONTAINER" >> "$LOG_FILE" 2>&1 || true
