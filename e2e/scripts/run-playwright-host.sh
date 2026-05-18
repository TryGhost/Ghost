#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
source "$SCRIPT_DIR/resolve-e2e-mode.sh"

cd "$REPO_ROOT"

GHOST_E2E_MODE="$(resolve_e2e_mode)"
export GHOST_E2E_MODE

if [[ "$GHOST_E2E_MODE" == "dev" ]]; then
  echo "E2E mode: dev (detected admin dev server at $LOCAL_ADMIN_DEV_SERVER_URL)"
else
  echo "E2E mode: build (admin dev server not detected at $LOCAL_ADMIN_DEV_SERVER_URL)"
  echo "  Tip: For local development, run 'pnpm dev' first — dev mode is faster and doesn't require a pre-built Docker image."
fi

# Dev-mode E2E Ghost containers mount the local workspace package, which needs a
# built entrypoint before Ghost can require it during boot.
if [[ "$GHOST_E2E_MODE" == "dev" ]]; then
  pnpm --filter @tryghost/parse-email-address build >/dev/null
fi

if [[ "${CI:-}" != "true" ]]; then
  node "$REPO_ROOT/e2e/scripts/sync-tinybird-state.mjs"
fi

cd "$REPO_ROOT/e2e"
exec "$@"
