#!/usr/bin/env bash
set -euo pipefail

source "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/load-playwright-container-env.sh"
GATEWAY_IMAGE="${GHOST_E2E_GATEWAY_IMAGE:-caddy:2-alpine}"

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
    {
        echo "playwright_version=${PLAYWRIGHT_VERSION}"
        echo "playwright_image=${PLAYWRIGHT_IMAGE}"
    } >> "$GITHUB_OUTPUT"
fi

echo "Preparing E2E build-mode runtime"
echo "Playwright image: ${PLAYWRIGHT_IMAGE}"
echo "Gateway image: ${GATEWAY_IMAGE}"

pids=()
labels=()

run_bg() {
    local label="$1"
    shift
    labels+=("$label")
    (
        echo "[${label}] starting"
        "$@"
        echo "[${label}] done"
    ) &
    pids+=("$!")
}

run_bg "pull-gateway-image" docker pull "$GATEWAY_IMAGE"
run_bg "pull-playwright-image" docker pull "$PLAYWRIGHT_IMAGE"
run_bg "start-infra" bash "$REPO_ROOT/e2e/scripts/infra-up.sh"

for i in "${!pids[@]}"; do
    if ! wait "${pids[$i]}"; then
        echo "[${labels[$i]}] failed" >&2
        exit 1
    fi
done

node "$REPO_ROOT/e2e/scripts/sync-tinybird-state.mjs"
