#!/usr/bin/env bash
#
# Run the smoke lane against the dev stack.
#
# Smoke tests drive the long-lived dev stack, not a per-test Ghost instance, so
# this script makes sure that stack is up before handing over to Playwright, and
# leaves it running afterwards.

set -euo pipefail

E2E_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${E2E_DIR}/.." && pwd)"
CONFIG="smoke/smoke.playwright.config.ts"

# The spec and its config agree on one base URL; read it from the config so
# there is only ever one place to change it.
CONFIG_BASE_URL="$(grep -o "GHOST_BASE_URL || '[^']*'" "${E2E_DIR}/${CONFIG}" | head -1 | sed "s/.*'\\(.*\\)'/\\1/")"
BASE_URL="${GHOST_BASE_URL:-${CONFIG_BASE_URL:-http://localhost:2368}}"
ADMIN_DEV_URL="${GHOST_ADMIN_DEV_URL:-http://127.0.0.1:5174/}"

DEV_LOG="${REPO_ROOT}/.dev-stripe-smoke.log"
READY_TIMEOUT_SECONDS="${SMOKE_READY_TIMEOUT:-600}"

ghost_ready() {
  curl -fsS -o /dev/null --max-time 5 "${BASE_URL}/ghost/api/admin/site/" 2>/dev/null
}

admin_ready() {
  # Vite answers with a redirect before it answers with the app, so any response
  # at all is what "listening" means here.
  curl -sS -o /dev/null --max-time 5 "${ADMIN_DEV_URL}" 2>/dev/null
}

stack_ready() {
  ghost_ready && admin_ready
}

if stack_ready; then
  echo "[smoke] dev stack already up at ${BASE_URL}"
else
  echo "[smoke] no dev stack at ${BASE_URL} — starting \`pnpm dev:stripe\` in the background"
  echo "[smoke] log: ${DEV_LOG}"
  : >"${DEV_LOG}"
  (
    cd "${REPO_ROOT}"
    nohup pnpm dev:stripe >>"${DEV_LOG}" 2>&1 &
    disown
  )

  echo "[smoke] waiting up to ${READY_TIMEOUT_SECONDS}s for Ghost to boot and Admin to serve..."
  deadline=$(( $(date +%s) + READY_TIMEOUT_SECONDS ))
  until stack_ready; do
    if [ "$(date +%s)" -ge "${deadline}" ]; then
      echo "[smoke] the dev stack did not come up within ${READY_TIMEOUT_SECONDS}s." >&2
      echo "[smoke] read the log for what went wrong: ${DEV_LOG}" >&2
      echo "[smoke] a wedged Docker is the usual cause; 'orbctl stop && orbctl start' clears it." >&2
      exit 1
    fi
    sleep 5
  done
  echo "[smoke] dev stack up at ${BASE_URL}"
fi

echo "[smoke] note: dev:stripe prefers a Tailscale tunnel for Stripe webhooks. Without one the"
echo "[smoke]       Stripe steps skip and the run still passes."
echo

cd "${E2E_DIR}"
exec pnpm exec playwright test -c "${CONFIG}" "$@"
