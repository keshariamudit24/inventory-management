#!/usr/bin/env bash
# Runs on the server. Usage: APP_IMAGE=ghcr.io/owner/repo:tag ./deploy.sh
# Deploys the new image, checks /health, and rolls back to the last good image on failure.
set -u
cd "$(dirname "$0")"

PREVIOUS=$(cat .current_image 2>/dev/null || true)

echo "Deploying $APP_IMAGE"
docker compose pull app
docker compose up -d

for i in $(seq 1 15); do
  if curl -fs http://localhost/health > /dev/null; then
    echo "$APP_IMAGE" > .current_image
    echo "Deployment is healthy"
    exit 0
  fi
  sleep 4
done

echo "Health check failed"
if [ -n "$PREVIOUS" ]; then
  echo "Rolling back to $PREVIOUS"
  APP_IMAGE=$PREVIOUS docker compose up -d
fi
exit 1
