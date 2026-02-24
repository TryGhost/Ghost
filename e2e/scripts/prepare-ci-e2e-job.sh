#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ -z "${GHOST_E2E_BASE_IMAGE:-}" ]]; then
  echo "GHOST_E2E_BASE_IMAGE is required" >&2
  exit 1
fi

cd "$REPO_ROOT"

echo "Preparing CI E2E job"
echo "Base image: ${GHOST_E2E_BASE_IMAGE}"
echo "E2E image: ${GHOST_E2E_IMAGE:-ghost-e2e:local}"

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

# Mostly IO-bound runtime prep (image pulls + infra startup + Tinybird sync) can
# overlap with the app/docker builds.
run_bg "runtime-preflight" bash "$REPO_ROOT/e2e/scripts/prepare-ci-e2e-build-mode.sh"

# Build the assets + E2E image layer while IO-heavy prep is running.
yarn workspace @tryghost/e2e build:apps
yarn workspace @tryghost/e2e build:docker

for i in "${!pids[@]}"; do
    if ! wait "${pids[$i]}"; then
        echo "[${labels[$i]}] failed" >&2
        exit 1
    fi
done
