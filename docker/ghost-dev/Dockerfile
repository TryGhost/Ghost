# Minimal Development Dockerfile for Ghost Core
# Source code is mounted at runtime for hot-reload support

ARG NODE_VERSION=22.13.1

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
COPY patches patches

# Install dependencies
# Note: Dependencies are installed at build time, but source code is mounted at runtime
RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,id=yarn-cache \
    yarn install --frozen-lockfile

# Source code will be mounted from host at /home/ghost/ghost/core
# This allows node --watch to pick up file changes for hot-reload
WORKDIR /home/ghost/ghost/core

CMD ["node", "--watch", "--import=tsx", "index.js"]

