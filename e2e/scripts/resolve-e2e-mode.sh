#!/usr/bin/env bash
set -euo pipefail

LOCAL_ADMIN_DEV_SERVER_URL="${LOCAL_ADMIN_DEV_SERVER_URL:-http://127.0.0.1:5174}"

resolve_e2e_mode() {
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
