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

# Ghost's own `url` config (default http://localhost:2368) is what session
# CSRF checks compare the browser's Origin header against (see
# cookieCsrfProtection in ghost/core/core/server/services/auth/session/
# session-service.js). Codespaces serves everything through a forwarded
# https://<name>-2368.<domain> origin instead, so without this every
# authenticated admin request fails that origin check and bounces back to
# login. `url` is a top-level nconf key, so a bare `url` env var overrides
# it (see ghost/core/core/shared/config/loader.js's nconf.env() call).
# Local (non-Codespaces) VS Code Dev Containers forward to genuine
# localhost, so this only applies inside Codespaces itself.
if [ -n "${CODESPACES:-}" ] && [ -n "${CODESPACE_NAME:-}" ]; then
    export url="https://${CODESPACE_NAME}-2368.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
    echo "Codespaces detected: setting Ghost url=$url so admin session origin checks match the forwarded tunnel" >> /tmp/ghost-backend.log
fi

# Append to log files (don't truncate) so previous crash tails survive a
# restart and the user can still tail them for context.
{ echo "=== $(date -Is) starting backend ==="; } >> /tmp/ghost-backend.log
nohup pnpm --filter ghost dev >> /tmp/ghost-backend.log 2>&1 &
disown

{ echo "=== $(date -Is) starting frontends ==="; } >> /tmp/ghost-frontends.log
# Matches root `pnpm dev`'s default fan-out (Admin + Portal only) — most
# devcontainer sessions never touch the public UMD apps, and those watchers
# are the heaviest processes in the stack. To also start them, run e.g.:
#   pnpm nx run-many -t dev --projects=@tryghost/comments-ui,@tryghost/signup-form,@tryghost/sodo-search,@tryghost/announcement-bar,@tryghost/admin-toolbar
nohup pnpm nx run-many -t dev \
    --projects=@tryghost/admin,@tryghost/portal \
    >> /tmp/ghost-frontends.log 2>&1 &
disown

cat <<'MSG'
Ghost dev stack starting in the background.

  Backend log:  tail -f /tmp/ghost-backend.log
  Frontend log: tail -f /tmp/ghost-frontends.log
  Gateway:      http://localhost:2368/

Give it ~30-60s, then open http://localhost:2368/ghost/ for admin.

Only Admin + Portal dev watchers start by default. To add the public UMD
apps (Comments, Signup Form, Sodo Search, Announcement Bar, Admin Toolbar):
  pnpm nx run-many -t dev --projects=@tryghost/comments-ui,@tryghost/signup-form,@tryghost/sodo-search,@tryghost/announcement-bar,@tryghost/admin-toolbar
MSG
