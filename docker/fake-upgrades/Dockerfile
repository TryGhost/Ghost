# syntax=docker/dockerfile:1@sha256:4edf897a3ffa55b89f906fc8cc78afdb3f1834cc9c7083565e611a8a7d5fe99e
ARG NODE_VERSION=22.23.3
FROM node:$NODE_VERSION-bookworm-slim

WORKDIR /home/ghost
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.mjs ./
# pnpm reads patchedDependencies even for filtered installs.
COPY patches patches
# Keep dependency installation cached when source files change. All workspace
# manifests are needed to resolve E2E's workspace references from the lockfile.
COPY --parents ghost/package.json apps/*/package.json koenig/*/package.json tools/configs/*/package.json packages/**/package.json e2e/package.json tools/scripts/package.json ./
COPY tools/scripts/enforce-package-manager.ts tools/scripts/
COPY .github/hooks .github/hooks
RUN corepack enable
# node_modules must live in the image, not link into a pnpm store outside it
ENV pnpm_config_enable_global_virtual_store=false
# The fake runs the upgrade contract from source, which needs its own dependencies.
RUN --mount=type=cache,target=/root/.local/share/pnpm/store,id=pnpm-store \
    pnpm install --filter @tryghost/e2e --filter @tryghost/adapter-base-upgrade --frozen-lockfile --prefer-offline

# Use the same fake host as browser E2E tests, with the contract it checks against.
COPY e2e/tsconfig.json e2e/tsconfig.json
COPY e2e/helpers/services/fake-server.ts e2e/helpers/services/fake-server.ts
COPY e2e/helpers/services/upgrade e2e/helpers/services/upgrade
COPY packages/adapters/upgrade-base/src packages/adapters/upgrade-base/src
COPY --chmod=755 docker/fake-upgrades/entrypoint.sh /usr/local/bin/fake-upgrades
WORKDIR /home/ghost/e2e
ENTRYPOINT ["/usr/local/bin/fake-upgrades"]
