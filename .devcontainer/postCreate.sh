#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/Ghost

corepack enable
corepack prepare --activate

git submodule update --init --recursive

# pnpm install already ran in onCreateCommand against this same fully-mounted
# workspace (submodules are theme content, not workspace packages, so their
# absence above didn't affect that install) — a second pass here would just
# re-walk the whole dependency graph for nothing.

# `pnpm dev` and gx load @tryghost/parse-email-address from source. Legacy Core
# commands such as `node index.js repl` still need its build.
pnpm --filter @tryghost/parse-email-address build
