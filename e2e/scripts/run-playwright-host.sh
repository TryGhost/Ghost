#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
LOCAL_ADMIN_DEV_SERVER_URL="${LOCAL_ADMIN_DEV_SERVER_URL:-http://127.0.0.1:5174}"

detect_mode() {
  if [[ -n "${GHOST_E2E_MODE:-}" ]]; then
    printf '%s' "$GHOST_E2E_MODE"
    return
  fi

  if curl --silent --fail --max-time 1 "$LOCAL_ADMIN_DEV_SERVER_URL" >/dev/null 2>&1; then
    printf 'dev'
    return
  fi

  printf 'build'
}

cd "$REPO_ROOT"

GHOST_E2E_MODE="$(detect_mode)"
export GHOST_E2E_MODE

if [[ "$GHOST_E2E_MODE" == "dev" ]]; then
  echo "E2E mode: dev (detected admin dev server at $LOCAL_ADMIN_DEV_SERVER_URL)"
else
  echo "E2E mode: build (admin dev server not detected at $LOCAL_ADMIN_DEV_SERVER_URL)"
fi

# Dev-mode E2E Ghost containers mount the local workspace package, which needs a
# built entrypoint before Ghost can require it during boot.
if [[ "$GHOST_E2E_MODE" == "dev" ]]; then
  yarn workspace @tryghost/parse-email-address build >/dev/null
fi

if [[ "${CI:-}" != "true" ]]; then
  node "$REPO_ROOT/e2e/scripts/sync-tinybird-state.mjs"
fi

cd "$REPO_ROOT/e2e"
exec "$@"
