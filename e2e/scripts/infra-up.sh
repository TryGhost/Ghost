#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/resolve-e2e-mode.sh"

cd "$REPO_ROOT"

MODE="$(resolve_e2e_mode)"
export GHOST_E2E_MODE="$MODE"
ANALYTICS_ENABLED="${GHOST_E2E_ANALYTICS:-true}"

if [[ "$MODE" != "build" ]]; then
  DEV_COMPOSE_PROJECT="${COMPOSE_PROJECT_NAME:-ghost-dev}"
  GHOST_DEV_IMAGE="${DEV_COMPOSE_PROJECT}-ghost-dev"
  GATEWAY_IMAGE="${DEV_COMPOSE_PROJECT}-ghost-dev-gateway"

  if ! docker image inspect "$GHOST_DEV_IMAGE" >/dev/null 2>&1 || ! docker image inspect "$GATEWAY_IMAGE" >/dev/null 2>&1; then
    echo "Building missing dev images for E2E (${GHOST_DEV_IMAGE}, ${GATEWAY_IMAGE})..."
    docker compose -f compose.dev.yaml -f compose.dev.analytics.yaml build ghost-dev ghost-dev-gateway
  fi
fi

compose_files=(-f compose.dev.yaml)
services=(mysql redis mailpit)

if [[ "$ANALYTICS_ENABLED" == "true" ]]; then
  compose_files+=(-f compose.dev.analytics.yaml)
  services+=(tinybird-local analytics)
fi

docker compose "${compose_files[@]}" up -d --wait "${services[@]}"
