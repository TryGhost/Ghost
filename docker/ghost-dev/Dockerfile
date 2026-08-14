# Minimal Development Dockerfile for Ghost Core
# Source code is mounted at runtime for hot-reload support

ARG NODE_VERSION=22.18.0

FROM node:$NODE_VERSION-bullseye-slim

# Install system dependencies needed for building native modules
RUN apt-get update && \
    apt-get install -y \
    build-essential \
    curl \
    python3 \
    git && \
    rm -rf /var/lib/apt/lists/* && \
    apt clean

WORKDIR /home/ghost

# Copy package files for dependency installation
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY ghost/core/package.json ghost/core/package.json
COPY ghost/i18n/package.json ghost/i18n/package.json
COPY ghost/parse-email-address/package.json ghost/parse-email-address/package.json
# Koenig packages in ghost/core's server-side dependency graph (direct deps
# plus kg-utils/kg-default-transforms, which they depend on). The editor UI
# packages (koenig-lexical, kg-unsplash-selector, kg-simplemde) are admin
# build-time deps and stay out of the server image.
COPY koenig/kg-card-factory/package.json koenig/kg-card-factory/package.json
COPY koenig/kg-clean-basic-html/package.json koenig/kg-clean-basic-html/package.json
COPY koenig/kg-converters/package.json koenig/kg-converters/package.json
COPY koenig/kg-default-cards/package.json koenig/kg-default-cards/package.json
COPY koenig/kg-default-nodes/package.json koenig/kg-default-nodes/package.json
COPY koenig/kg-default-transforms/package.json koenig/kg-default-transforms/package.json
COPY koenig/kg-html-to-lexical/package.json koenig/kg-html-to-lexical/package.json
COPY koenig/kg-lexical-html-renderer/package.json koenig/kg-lexical-html-renderer/package.json
COPY koenig/kg-markdown-html-renderer/package.json koenig/kg-markdown-html-renderer/package.json
COPY koenig/kg-utils/package.json koenig/kg-utils/package.json

# Install dependencies
# Note: Dependencies are installed at build time, but source code is mounted at runtime.

# Copy root lifecycle scripts/hooks needed by `pnpm install`
COPY .github/scripts .github/scripts
COPY .github/hooks .github/hooks

# Enable corepack so it can read packageManager from package.json and provide pnpm
RUN corepack enable

# Install deps with a persistent pnpm store cache to speed up rebuilds
RUN --mount=type=cache,target=/root/.local/share/pnpm/store,id=pnpm-store \
    pnpm install --frozen-lockfile --prefer-offline

# Copy entrypoint script that optionally loads Tinybird config
COPY docker/ghost-dev/entrypoint.sh entrypoint.sh
RUN chmod +x entrypoint.sh

# Public app assets are served via /ghost/assets/* in dev mode.
# Caddy forwards these paths to host frontend dev servers.
ENV portal__url=/ghost/assets/portal/portal.min.js \
    comments__url=/ghost/assets/comments-ui/comments-ui.min.js \
    sodoSearch__url=/ghost/assets/sodo-search/sodo-search.min.js \
    sodoSearch__styles=/ghost/assets/sodo-search/main.css \
    signupForm__url=/ghost/assets/signup-form/signup-form.min.js \
    announcementBar__url=/ghost/assets/announcement-bar/announcement-bar.min.js \
    adminToolbar__url=/ghost/assets/admin-toolbar/admin-toolbar.min.js

# Source code will be mounted from host at /home/ghost/ghost/core
# This allows the Ghost dev script to pick up file changes for hot-reload
WORKDIR /home/ghost/ghost/core

ENTRYPOINT ["/home/ghost/entrypoint.sh"]
CMD ["pnpm", "dev"]
