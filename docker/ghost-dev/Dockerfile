# syntax=docker/dockerfile:1
# Minimal Development Dockerfile for Ghost Core
# Source code is mounted at runtime for hot-reload support

ARG NODE_VERSION=22.23.1

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

# Copy root workspace files for dependency installation. .pnpmfile.mjs must be
# included: pnpm records its checksum (pnpmfileChecksum) in pnpm-lock.yaml, so
# the --frozen-lockfile install below fails with a lockfile config mismatch if
# the file is absent — even though its only hook (beforePacking) never runs
# during install.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .pnpmfile.mjs ./

# Copy the manifests of the top-level dirs that hold ghost/core's dependency
# closure — ghost/* (core, i18n, parse-email-address), koenig/* (the kg-*
# packages), and configs/* (the shared eslint config, a dev dep in the graph).
# --parents preserves each file's directory structure (plain COPY globs would
# flatten them); node_modules is excluded by .dockerignore. apps/* and e2e
# are deliberately omitted: nothing in ghost/core's closure lives there,
# so leaving them out keeps this layer (and the install below) from
# busting cache when an unrelated frontend package.json changes. `pnpm install
# --filter "ghost..."` then installs exactly the closure — pnpm's own graph is
# the source of truth, not a hand-maintained COPY list. (If a closure member is
# ever added under a new top-level dir — e.g. parse-email-address moving to
# packages/ — the filtered install will fail loudly with the missing manifest,
# which is the signal to add that dir here.)
COPY --parents \
    ghost/*/package.json \
    koenig/*/package.json \
    configs/*/package.json \
    packages/**/package.json \
    ./

# Copy root lifecycle scripts/hooks needed by `pnpm install`. Only the preinstall
# hook is taken from the scripts/ workspace — copying the whole dir would bust
# this layer (and the install below) whenever any unrelated script changes. Its
# package.json comes along so the workspace member pnpm-workspace.yaml declares
# actually exists; the filtered install below never builds it.
COPY scripts/package.json scripts/enforce-package-manager.js scripts/
COPY .github/hooks .github/hooks

# Enable corepack so it can read packageManager from package.json and provide pnpm
RUN corepack enable

# Install ONLY ghost/core's workspace closure (its name is "ghost"; the trailing
# "..." selects it plus every workspace dependency). Deps live in the shared
# root store; non-selected projects (apps/*, e2e, ...) have their
# manifests present but are not installed.
RUN --mount=type=cache,target=/root/.local/share/pnpm/store,id=pnpm-store \
    pnpm install --filter "ghost..." --frozen-lockfile --prefer-offline

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
