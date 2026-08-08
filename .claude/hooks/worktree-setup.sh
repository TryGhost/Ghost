#!/usr/bin/env bash
# Bootstraps a fresh Ghost checkout so `pnpm dev` works immediately: installs
# workspace dependencies and theme submodules. Run it from a checkout root,
# or let the SessionStart hook in .claude/settings.json run it for you.
#
# Fast path:
# - `pnpm install` and submodule init are independent, so they run in parallel
# - linked worktrees get their own submodule gitdirs, so a plain
#   `git submodule update --init` re-clones the themes from GitHub every time;
#   when a sibling checkout (usually the main one) already has the pinned
#   commit we clone from it with --reference/--dissociate instead, which is
#   local-disk fast and works offline
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

init_submodules() {
    local common main sm sha rc=0
    common="$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null)" || return 1
    main="$(dirname "$common")"
    for sm in $(git config --file .gitmodules --get-regexp '\.path$' 2>/dev/null | awk '{print $2}'); do
        sha="$(git ls-tree HEAD "$sm" --object-only 2>/dev/null)"
        if [ -n "$sha" ] && git -C "$main/$sm" cat-file -e "$sha" 2>/dev/null; then
            git submodule update --init --recursive --dissociate --reference "$main/$sm" "$sm" || rc=1
        else
            git submodule update --init --recursive "$sm" || rc=1
        fi
    done
    return "$rc"
}

pnpm install --frozen-lockfile >>"$LOG" 2>&1 &
install_pid=$!
init_submodules >>"$LOG" 2>&1 &
submodules_pid=$!

install_rc=0
submodules_rc=0
wait "$install_pid" || install_rc=$?
wait "$submodules_pid" || submodules_rc=$?
echo "worktree-setup finished in ${SECONDS}s (pnpm install rc=$install_rc, submodules rc=$submodules_rc)" >>"$LOG"

if [ "$install_rc" -eq 0 ] && [ "$submodules_rc" -eq 0 ]; then
    echo "Fresh Ghost checkout: deps + theme submodules installed in ${SECONDS}s; pnpm dev is ready."
else
    echo "Fresh Ghost checkout: setup FAILED (pnpm install rc=$install_rc, submodules rc=$submodules_rc) - check ~/.claude/ghost-worktree-setup.log and run 'pnpm run setup' manually before pnpm dev."
fi
exit 0
