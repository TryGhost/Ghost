# syntax=docker/dockerfile:1@sha256:ecfaec9ed6d810b56388c508f4121597bfbba70d41a6dfeee4d8cad5f295fc32
ARG NODE_VERSION=22.23.3
FROM node:$NODE_VERSION-bookworm-slim

WORKDIR /home/ghost
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.mjs ./
# pnpm reads patchedDependencies even for filtered installs.
COPY patches patches
# Keep dependency installation cached when source files change. All workspace
# manifests are needed to resolve E2E's workspace references from the lockfile.
COPY --parents ghost/*/package.json apps/*/package.json koenig/*/package.json configs/*/package.json packages/**/package.json e2e/package.json scripts/package.json ./
COPY scripts/enforce-package-manager.js scripts/
COPY .github/hooks .github/hooks
RUN corepack enable
RUN --mount=type=cache,target=/root/.local/share/pnpm/store,id=pnpm-store \
    pnpm install --filter @tryghost/e2e --frozen-lockfile --prefer-offline

# Use the same fake API and forwarding code as browser E2E tests.
COPY e2e/tsconfig.json e2e/tsconfig.json
COPY e2e/helpers/services/fake-server.ts e2e/helpers/services/fake-server.ts
COPY e2e/helpers/services/mailgun/fake-mailgun-server.ts e2e/helpers/services/mailgun/fake-mailgun-server.ts
COPY --chmod=755 docker/fake-mailgun/entrypoint.sh /usr/local/bin/fake-mailgun
WORKDIR /home/ghost/e2e
ENTRYPOINT ["/usr/local/bin/fake-mailgun"]
