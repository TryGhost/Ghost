#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/Ghost

corepack enable
corepack prepare --activate

git submodule update --init --recursive

pnpm install --prefer-offline

# Build internal @tryghost/* workspace packages that ghost/core imports at
# runtime (e.g. @tryghost/parse-email-address's "main": "build/index.js").
# On host, `pnpm dev` triggers these via Nx dependsOn cascades; inside the
# devcontainer we invoke workspace dev scripts directly, so we pre-build.
pnpm build
