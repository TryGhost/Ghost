#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

SKIP_IMAGE_BUILD="${GHOST_E2E_SKIP_IMAGE_BUILD:-false}"

if [[ "$SKIP_IMAGE_BUILD" != "true" && -z "${GHOST_E2E_BASE_IMAGE:-}" ]]; then
  echo "GHOST_E2E_BASE_IMAGE is required when building the E2E image in-job" >&2
  exit 1
fi

cd "$REPO_ROOT"

echo "Preparing CI E2E job"
echo "E2E image: ${GHOST_E2E_IMAGE:-ghost-e2e:local}"
echo "Skip image build: ${SKIP_IMAGE_BUILD}"

if [[ "$SKIP_IMAGE_BUILD" != "true" ]]; then
    echo "Base image: ${GHOST_E2E_BASE_IMAGE}"
fi

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

if [[ "$SKIP_IMAGE_BUILD" == "true" ]]; then
    echo "Using prebuilt E2E image; skipping app and Docker image build."
else
    # Build the assets + E2E image layer while IO-heavy prep is running.
    pnpm --filter @tryghost/e2e build:apps
    pnpm --filter @tryghost/e2e build:docker
fi

for i in "${!pids[@]}"; do
    if ! wait "${pids[$i]}"; then
        echo "[${labels[$i]}] failed" >&2
        exit 1
    fi
done
