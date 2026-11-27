#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/Ghost

# Skip if the Admin dev server already holds port 2368 — avoids
# double-starting on VS Code reload/re-attach. The subshell isolates bash's
# noisy "connection refused" message on first run when nothing's listening yet.
if (exec 3<>/dev/tcp/127.0.0.1/2368) 2>/dev/null; then
    echo "Ghost dev stack already running on :2368, skipping start."
    exit 0
fi

echo "Starting Ghost dev stack..."

# Ghost's links and Admin origin check need the URL the browser uses, which in
# Codespaces is the forwarded port's https address
if [ -n "${CODESPACES:-}" ] && [ -n "${CODESPACE_NAME:-}" ]; then
    export url="https://${CODESPACE_NAME}-2368.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}/"
fi

# Append to the log (don't truncate) so a previous crash's tail survives a
# restart and the user can still tail it for context.
{ echo "=== $(date -Is) starting pnpm dev ==="; } >> /tmp/ghost-dev.log
nohup pnpm dev >> /tmp/ghost-dev.log 2>&1 &
disown

cat <<MSG
Ghost dev stack starting in the background.

  Log:   tail -f /tmp/ghost-dev.log
  Admin: ${url:-http://localhost:2368/}ghost/

The first start builds Admin's dependencies, so give it a few minutes.
MSG
