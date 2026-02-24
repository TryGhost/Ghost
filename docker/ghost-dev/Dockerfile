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
COPY package.json yarn.lock ./
COPY ghost/core/package.json ghost/core/package.json
COPY ghost/i18n/package.json ghost/i18n/package.json
COPY ghost/parse-email-address/package.json ghost/parse-email-address/package.json

# Install dependencies
# Note: Dependencies are installed at build time, but source code is mounted at runtime
COPY .github/scripts/install-deps.sh .github/scripts/install-deps.sh
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,id=yarn-cache \
    bash .github/scripts/install-deps.sh

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
    announcementBar__url=/ghost/assets/announcement-bar/announcement-bar.min.js

# Source code will be mounted from host at /home/ghost/ghost/core
# This allows node --watch to pick up file changes for hot-reload
WORKDIR /home/ghost/ghost/core

ENTRYPOINT ["/home/ghost/entrypoint.sh"]
CMD ["node", "--watch", "--import=tsx", "index.js"]
