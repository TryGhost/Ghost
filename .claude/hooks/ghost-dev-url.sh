#!/usr/bin/env bash
#
# SessionStart hook: tells the session this checkout's Ghost Admin URL and whether
# Ghost answers there. SessionStart stdout becomes session context.

env_file="$CLAUDE_PROJECT_DIR/.ghost-dev.env"
[ -f "$env_file" ] || exit 0

port=${GHOST_DEV_PORT:-$(sed -n 's/^GHOST_DEV_PORT=//p' "$env_file")}
host=${GHOST_DEV_HOSTNAME:-$(sed -n 's/^GHOST_DEV_HOSTNAME=//p' "$env_file")}
[ -n "$port" ] || exit 0
url="http://${host:-localhost}:${port}/ghost/"

# Every session start waits for this, so the check gives up quickly
state=""
if command -v curl >/dev/null 2>&1; then
    state=" (not running)"
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 0.4 "${url}api/admin/site/")
    [ "$code" = 200 ] && state=" (running)"
fi
echo "Ghost Admin for this checkout: ${url}${state}"
exit 0
