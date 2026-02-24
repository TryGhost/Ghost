#!/usr/bin/env bash
set -euo pipefail

if [[ $# -lt 2 ]]; then
    echo "Usage: $0 <shard-index> <shard-total> [retries]" >&2
    exit 1
fi

SHARD_INDEX="$1"
SHARD_TOTAL="$2"
RETRIES="${3:-2}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

PLAYWRIGHT_VERSION="$(node -p 'require("./e2e/package.json").devDependencies["@playwright/test"]')"
PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble"
WORKSPACE_PATH="${GITHUB_WORKSPACE:-$REPO_ROOT}"

docker run --rm --network host --ipc host \
  -v /var/run/docker.sock:/var/run/docker.sock \
  -v "${WORKSPACE_PATH}:${WORKSPACE_PATH}" \
  -w "${WORKSPACE_PATH}/e2e" \
  -e CI=true \
  -e TEST_WORKERS_COUNT="${TEST_WORKERS_COUNT:-1}" \
  -e GHOST_E2E_MODE="${GHOST_E2E_MODE:-build}" \
  -e GHOST_E2E_IMAGE="${GHOST_E2E_IMAGE:-ghost-e2e:local}" \
  "$PLAYWRIGHT_IMAGE" \
  yarn test:all --shard="${SHARD_INDEX}/${SHARD_TOTAL}" --retries="${RETRIES}"
