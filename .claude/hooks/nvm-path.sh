#!/usr/bin/env bash
#
# SessionStart hook — put the project's nvm-managed Node on PATH for the whole
# Claude Code session.
#
# Why this exists: a GUI-launched Claude Code (e.g. the desktop app) does not
# source your login shell, so nvm's PATH setup is absent and `node` isn't found
# by the Bash tool.
#
# Why a SessionStart hook (not a per-command PreToolUse rewrite): Claude Code's
# Bash permission classifier prompts on any command whose leading `PATH=...`
# assignment it can't statically clear — so rewriting every command to inject
# PATH prompts on every single call. Instead we set PATH ONCE here, via
# $CLAUDE_ENV_FILE (the documented mechanism for a hook to export env vars into
# the session). Env vars are not permission-checked, so there are zero prompts
# and no per-command overhead.
#
# Graceful when nvm is absent: if ~/.nvm/nvm.sh doesn't exist (or no Node
# resolves), nothing is written and the session is unaffected — so teammates
# without nvm see no change.

# CLAUDE_ENV_FILE is provided by Claude Code; export lines appended here are
# sourced into the session's environment.
[ -n "$CLAUDE_ENV_FILE" ] || exit 0

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] || exit 0

# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh" >/dev/null 2>&1
nvm use >/dev/null 2>&1                 # respects the repo's .nvmrc (else default)
node_path=$(command -v node 2>/dev/null)
[ -n "$node_path" ] || exit 0

# Prepend nvm's Node bin dir to PATH for every Bash command this session. $PATH
# is left unexpanded here on purpose — Claude Code expands it when it sources
# this file, so we prepend to the session's actual PATH.
printf 'export PATH="%s:$PATH"\n' "$(dirname "$node_path")" >> "$CLAUDE_ENV_FILE"
exit 0
