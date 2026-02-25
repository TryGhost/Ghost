#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

MODE="${GHOST_E2E_MODE:-dev}"
if [[ "$MODE" != "build" ]]; then
  DEV_COMPOSE_PROJECT="${COMPOSE_PROJECT_NAME:-ghost-dev}"
  GHOST_DEV_IMAGE="${DEV_COMPOSE_PROJECT}-ghost-dev"
  GATEWAY_IMAGE="${DEV_COMPOSE_PROJECT}-ghost-dev-gateway"

  if ! docker image inspect "$GHOST_DEV_IMAGE" >/dev/null 2>&1 || ! docker image inspect "$GATEWAY_IMAGE" >/dev/null 2>&1; then
    echo "Building missing dev images for E2E (${GHOST_DEV_IMAGE}, ${GATEWAY_IMAGE})..."
    docker compose -f compose.dev.yaml -f compose.dev.analytics.yaml build ghost-dev ghost-dev-gateway
  fi
fi

docker compose -f compose.dev.yaml -f compose.dev.analytics.yaml up -d --wait \
  mysql redis mailpit tinybird-local analytics
