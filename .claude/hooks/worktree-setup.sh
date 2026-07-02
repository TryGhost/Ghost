#!/usr/bin/env bash
# Bootstraps a fresh Ghost checkout so `pnpm dev` works immediately: installs
# workspace dependencies and default themes. Run it from a checkout root,
# or let the SessionStart hook in .claude/settings.json run it for you.
#
# Fast path:
# - `pnpm install` and the theme fetch are independent, so they run in parallel
# - themes come from ghost/core/scripts/fetch-themes.js (pinned versions,
#   local tarball cache), so repeat setups don't touch the network
set -u

[ "$(jq -r '.name // empty' package.json 2>/dev/null)" = "ghost-monorepo" ] || exit 0
[ -d node_modules ] && exit 0

LOG="$HOME/.claude/ghost-worktree-setup.log"
: > "$LOG"

export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" >/dev/null 2>&1
nvm use >/dev/null 2>&1
command -v pnpm >/dev/null 2>&1 || corepack enable pnpm >/dev/null 2>&1
if ! command -v pnpm >/dev/null 2>&1; then
    echo "Fresh Ghost checkout: setup FAILED - pnpm not found (install nvm or enable corepack), then run 'pnpm run setup' manually."
    exit 0
fi

pnpm install --frozen-lockfile >>"$LOG" 2>&1 &
install_pid=$!
node ghost/core/scripts/fetch-themes.js >>"$LOG" 2>&1 &
themes_pid=$!

install_rc=0
themes_rc=0
wait "$install_pid" || install_rc=$?
wait "$themes_pid" || themes_rc=$?
echo "worktree-setup finished in ${SECONDS}s (pnpm install rc=$install_rc, themes rc=$themes_rc)" >>"$LOG"

if [ "$install_rc" -eq 0 ] && [ "$themes_rc" -eq 0 ]; then
    echo "Fresh Ghost checkout: deps + default themes installed in ${SECONDS}s; pnpm dev is ready."
else
    echo "Fresh Ghost checkout: setup FAILED (pnpm install rc=$install_rc, themes rc=$themes_rc) - check ~/.claude/ghost-worktree-setup.log and run 'pnpm run setup' manually before pnpm dev."
fi
exit 0
