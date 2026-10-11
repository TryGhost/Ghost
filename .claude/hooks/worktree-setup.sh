#!/usr/bin/env bash
#
# SessionStart hook — runs `pnpm bootstrap` when this checkout is missing its
# dependencies or theme submodules, as a freshly created worktree is.

cd "$CLAUDE_PROJECT_DIR" 2>/dev/null || exit 0
grep -q '"name": "ghost-monorepo"' package.json 2>/dev/null || exit 0
[ -d node_modules ] &&
    [ -f ghost/content/themes/casper/package.json ] &&
    [ -f ghost/content/themes/source/package.json ] &&
    exit 0

# nvm-path.sh only sets PATH for the session's Bash commands, not for other hooks
export NVM_DIR="$HOME/.nvm"
if [ -s "$NVM_DIR/nvm.sh" ]; then
    # shellcheck disable=SC1091
    . "$NVM_DIR/nvm.sh" >/dev/null 2>&1
    nvm use >/dev/null 2>&1
fi

log="$PWD/.claude/worktree-setup.log"
if pnpm bootstrap >"$log" 2>&1; then
    echo "Fresh Ghost checkout: pnpm bootstrap completed (dependencies and theme submodules installed)."
else
    echo "Fresh Ghost checkout: pnpm bootstrap FAILED, see $log. Run pnpm bootstrap before tests or pnpm dev."
fi
