#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/Ghost

# Skip if backend is already bound to port 2368 — avoids double-starting on
# VS Code reload/re-attach. The subshell isolates bash's noisy
# "connection refused" message on first run when nothing's listening yet.
if (exec 3<>/dev/tcp/127.0.0.1/2368) 2>/dev/null; then
    echo "Ghost dev stack already running on :2368, skipping start."
    exit 0
fi

echo "Starting Ghost dev stack..."

# Append to log files (don't truncate) so previous crash tails survive a
# restart and the user can still tail them for context.
{ echo "=== $(date -Is) starting backend ==="; } >> /tmp/ghost-backend.log
nohup pnpm --filter ghost dev >> /tmp/ghost-backend.log 2>&1 &
disown

{ echo "=== $(date -Is) starting frontends ==="; } >> /tmp/ghost-frontends.log
nohup pnpm nx run-many -t dev \
    --projects=@tryghost/admin,@tryghost/portal,@tryghost/comments-ui,@tryghost/signup-form,@tryghost/sodo-search,@tryghost/announcement-bar \
    >> /tmp/ghost-frontends.log 2>&1 &
disown

cat <<'MSG'
Ghost dev stack starting in the background.

  Backend log:  tail -f /tmp/ghost-backend.log
  Frontend log: tail -f /tmp/ghost-frontends.log
  Gateway:      http://localhost:2368/

Give it ~30-60s, then open http://localhost:2368/ghost/ for admin.
MSG
