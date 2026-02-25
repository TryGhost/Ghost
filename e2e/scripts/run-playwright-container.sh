#!/usr/bin/env bash
set -euo pipefail

SHARD_INDEX="${E2E_SHARD_INDEX:-}"
SHARD_TOTAL="${E2E_SHARD_TOTAL:-}"
RETRIES="${E2E_RETRIES:-2}"

if [[ -z "$SHARD_INDEX" || -z "$SHARD_TOTAL" ]]; then
    echo "Missing E2E_SHARD_INDEX or E2E_SHARD_TOTAL environment variables" >&2
    exit 1
fi

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/load-playwright-container-env.sh"

docker run --rm --network host --ipc host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "${WORKSPACE_PATH}:${WORKSPACE_PATH}" \
  -w "${WORKSPACE_PATH}/e2e" \
  -e CI=true \
  -e TEST_WORKERS_COUNT="${TEST_WORKERS_COUNT:-1}" \
  -e COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-ghost-dev}" \
  -e GHOST_E2E_MODE="${GHOST_E2E_MODE:-build}" \
  -e GHOST_E2E_IMAGE="${GHOST_E2E_IMAGE:-ghost-e2e:local}" \
  -e GHOST_E2E_GATEWAY_IMAGE="${GHOST_E2E_GATEWAY_IMAGE:-caddy:2-alpine}" \
  "$PLAYWRIGHT_IMAGE" \
  yarn test:all --shard="${SHARD_INDEX}/${SHARD_TOTAL}" --retries="${RETRIES}"
