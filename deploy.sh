#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="/home/yc-user/backend-api"
HEALTH_URL="http://127.0.0.1:3000/health"

cd "$PROJECT_DIR"

previous_commit="$(git rev-parse HEAD)"

echo "Deploy started at $(date -Is)"
echo "Current commit: $previous_commit"

git fetch origin main
git pull --ff-only origin main

if docker compose version >/dev/null 2>&1; then
  compose=(docker compose)
else
  compose=(docker-compose)
fi

# docker-compose v1 is still installed on the production host and is not fully
# compatible with newer Docker image metadata when recreating containers.
api_containers="$(docker ps -aq --filter label=com.docker.compose.service=api)"
if [ -n "$api_containers" ]; then
  docker rm -f $api_containers
fi

"${compose[@]}" up -d --build

for attempt in {1..30}; do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    echo "Deploy finished successfully at $(date -Is)"
    exit 0
  fi

  echo "Waiting for API health check ($attempt/30)"
  sleep 2
done

echo "Health check failed, rolling back to $previous_commit"
git reset --hard "$previous_commit"
api_containers="$(docker ps -aq --filter label=com.docker.compose.service=api)"
if [ -n "$api_containers" ]; then
  docker rm -f $api_containers
fi
"${compose[@]}" up -d --build

for attempt in {1..30}; do
  if curl -fsS "$HEALTH_URL" >/dev/null; then
    echo "Rollback finished successfully at $(date -Is)"
    exit 1
  fi

  echo "Waiting for rollback health check ($attempt/30)"
  sleep 2
done

echo "Rollback health check failed"
exit 1
