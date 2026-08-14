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

# Build workspace packages that ghost/core imports at runtime with build
# outputs (not source). @tryghost/parse-email-address is the only one today
# — its package.json "main" points at build/index.js, so the backend can't
# import it on a fresh clone until it's compiled.
# On host, `pnpm dev` triggers this via Nx dependsOn cascades; inside the
# devcontainer we invoke `pnpm --filter ghost dev` directly, which bypasses
# those cascades.
# Frontend apps (admin, posts, stats, activitypub, etc.) do NOT need
# pre-building here — their own dev targets handle it when start-dev-stack.sh
# runs `nx run-many -t dev`.
pnpm --filter @tryghost/parse-email-address build
