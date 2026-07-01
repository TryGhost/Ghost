#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/resolve-e2e-mode.sh"

cd "$REPO_ROOT"

MODE="$(resolve_e2e_mode)"
export GHOST_E2E_MODE="$MODE"
ANALYTICS_ENABLED="${GHOST_E2E_ANALYTICS:-true}"
MYSQL_TMPFS_ENABLED="${GHOST_E2E_MYSQL_TMPFS:-true}"

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

if [[ "$MODE" == "build" && "$MYSQL_TMPFS_ENABLED" != "false" ]]; then
  compose_files+=(-f e2e/compose.e2e.tmpfs.yaml)

  # Prefer the pre-seeded mysql image, which skips first-boot initialization on the
  # empty tmpfs. Fall back to the pinned stock image from compose.dev.yaml when it's
  # unavailable (a fork, or before the publish workflow has built it). An explicit
  # GHOST_E2E_MYSQL_IMAGE is respected as-is. The tmpfs override reads the result.
  if [[ -z "${GHOST_E2E_MYSQL_IMAGE:-}" ]]; then
    STOCK_MYSQL_IMAGE="$(yq '.services.mysql.image' compose.dev.yaml)"
    MYSQL_VERSION="$(printf '%s' "$STOCK_MYSQL_IMAGE" | sed -E 's#^mysql:([^@]+).*#\1#')"
    PRESEEDED_MYSQL_IMAGE="ghcr.io/tryghost/ghost-e2e-mysql:${MYSQL_VERSION}"
    if docker image inspect "$PRESEEDED_MYSQL_IMAGE" >/dev/null 2>&1 || docker pull "$PRESEEDED_MYSQL_IMAGE" >/dev/null 2>&1; then
      GHOST_E2E_MYSQL_IMAGE="$PRESEEDED_MYSQL_IMAGE"
      echo "Using pre-seeded mysql image: $GHOST_E2E_MYSQL_IMAGE"
    else
      GHOST_E2E_MYSQL_IMAGE="$STOCK_MYSQL_IMAGE"
      echo "Pre-seeded mysql image unavailable; using stock mysql: $GHOST_E2E_MYSQL_IMAGE"
    fi
  fi
  export GHOST_E2E_MYSQL_IMAGE
fi

if [[ "$ANALYTICS_ENABLED" == "true" ]]; then
  compose_files+=(-f compose.dev.analytics.yaml)
  services+=(tinybird-local analytics)
fi

docker compose "${compose_files[@]}" up -d --wait "${services[@]}"
