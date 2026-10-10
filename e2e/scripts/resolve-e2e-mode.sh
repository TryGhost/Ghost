#!/usr/bin/env bash
set -euo pipefail

# `pnpm dev:docker` runs Admin's dev server on 5174; `pnpm dev` runs it in front
# of Ghost on the checkout's port in .ghost-dev.env.
if [[ -z "${LOCAL_ADMIN_DEV_SERVER_URL:-}" ]]; then
  LOCAL_ADMIN_DEV_SERVER_URL="http://127.0.0.1:5174"
  ghost_dev_env="$(dirname "${BASH_SOURCE[0]}")/../../.ghost-dev.env"
  ghost_dev_port="$(sed -n 's/^GHOST_DEV_PORT=//p' "$ghost_dev_env" 2>/dev/null || true)"
  if [[ -n "$ghost_dev_port" ]] && ! curl --silent --fail --max-time 1 "$LOCAL_ADMIN_DEV_SERVER_URL" >/dev/null 2>&1; then
    LOCAL_ADMIN_DEV_SERVER_URL="http://127.0.0.1:${ghost_dev_port}/__admin-dev__/"
  fi
fi

# Where dev-mode E2E gateways reach that server
admin_dev_port="${LOCAL_ADMIN_DEV_SERVER_URL#*://*:}"
export GHOST_E2E_ADMIN_DEV_SERVER="${GHOST_E2E_ADMIN_DEV_SERVER:-host.docker.internal:${admin_dev_port%%/*}}"

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
