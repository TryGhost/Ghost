#!/usr/bin/env bash
# Build the ghost-e2e:local Docker image locally, matching the CI flow.
#
# CI builds this image by:
#   1. pnpm build the monorepo (produces ghost/core/core/built/admin + apps/*/umd)
#   2. pnpm pack ghost/core into a tarball
#   3. extract the tarball → produces a curated `package/` directory
#   4. docker build --target full using `package/` as context
#   5. docker build the e2e layer on top, using repo root as context for apps/*/umd
#
# This script does the same locally. The pack/extract dance keeps the
# production image's build context curated (matches package.json `files`
# field), the same way CI does.
#
# Usage:
#   ./scripts/build-e2e-image.sh

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel)"
cd "$REPO_ROOT"

echo "→ Building monorepo (admin + foundation libs + public apps)"
# pnpm build runs the Nx graph in the correct order so the admin
# asset-delivery step lands assets in ghost/core/core/built/admin.
# Filtering to @tryghost/admin alone bypasses that chain and breaks the
# closeBundle copy hook — always go through the root build target.
pnpm build

echo "→ Compiling ghost/core TypeScript (emits .js next to .ts)"
# Nx caching can mark ghost-core:build as up-to-date without producing the
# .js outputs that production Node needs (tsx is only configured for tests).
# Running tsc directly is cheap and guarantees the emitted JS exists before
# pnpm pack copies the source tree.
pnpm --filter ghost build:tsc

echo "→ Building public app UMD bundles (apps/*/umd)"
# pnpm build leaves public apps' UMDs untouched; this target produces them.
pnpm --filter @tryghost/e2e build:apps

echo "→ Producing ghost/core/package/ via pnpm deploy"
# `pnpm pack` doesn't bundle workspace deps — the resulting tarball references
# private TryGhost packages by name only, which fails inside Docker (no auth,
# packages not on the public registry). `archive` runs scripts/pack.js, which
# uses `pnpm deploy --prod` to resolve workspace deps, packs private workspace
# packages as local component tarballs under components/, and writes the
# correct .npmrc + pnpm-workspace.yaml. This matches what CI does.
pnpm --filter ghost archive

echo "→ Building ghost-monorepo:latest (--target full)"
docker build \
    -f "$REPO_ROOT/Dockerfile.production" \
    --target full \
    -t ghost-monorepo:latest \
    "$REPO_ROOT/ghost/core/package"

echo "→ Building ghost-e2e:local on top"
GHOST_E2E_BASE_IMAGE=ghost-monorepo:latest \
    pnpm --filter @tryghost/e2e build:docker

echo ""
echo "✓ ghost-e2e:local built — run e2e in build mode with:"
echo "    cd e2e && pnpm test --reporter=line"
