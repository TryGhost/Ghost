#!/usr/bin/env bash
set -euo pipefail

LOCAL_ADMIN_DEV_SERVER_URL="${LOCAL_ADMIN_DEV_SERVER_URL:-http://127.0.0.1:5174}"

resolve_e2e_mode() {
  if [[ -n "${GHOST_E2E_MODE:-}" ]]; then
    case "$GHOST_E2E_MODE" in
      dev|build)
        printf '%s' "$GHOST_E2E_MODE"
        return
        ;;
      *)
        echo "Invalid GHOST_E2E_MODE: '$GHOST_E2E_MODE'. Expected one of: dev, build." >&2
        return 1
        ;;
    esac
  fi

  if curl --silent --fail --max-time 1 "$LOCAL_ADMIN_DEV_SERVER_URL" >/dev/null 2>&1; then
    printf 'dev'
    return
  fi

  printf 'build'
}
