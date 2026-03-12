#!/bin/bash
set -euo pipefail

# Install dependencies with --ignore-scripts for security
# Then conditionally install sqlite3 native binary when needed
#
# sqlite3 v6.0.1+ uses prebuild-install which downloads prebuilt binaries
# (no compilation needed). We use --ignore-scripts for security, so we manually
# run sqlite3's install script when sqlite3 is needed.

echo "Installing dependencies with --ignore-scripts..."
yarn install --frozen-lockfile --prefer-offline --ignore-scripts "$@"

# Determine if sqlite3 is needed
BUILD_SQLITE3=false

# CI environments (unless explicitly MySQL-only)
if [ -n "${CI:-}" ] && [ "${DB:-}" != "mysql8" ]; then
    BUILD_SQLITE3=true
fi

# Test/development environments
if [ "${NODE_ENV:-}" = "testing" ] || [ "${NODE_ENV:-}" = "testing-browser" ] || [ "${NODE_ENV:-}" = "development" ]; then
    BUILD_SQLITE3=true
fi

# Docker builds (ghost-dev Dockerfile sets WORKDIR to /home/ghost)
if [ "${PWD:-}" = "/home/ghost" ]; then
    BUILD_SQLITE3=true
fi

# Explicitly requested
if [ "${DB:-}" = "sqlite3" ]; then
    BUILD_SQLITE3=true
fi

# Install sqlite3 native binary if needed (uses prebuilt binaries, fast)
if [ "$BUILD_SQLITE3" = "true" ] && [ -d "node_modules/sqlite3" ]; then
    # Check if binary already exists
    if [ ! -f "node_modules/sqlite3/build/Release/node_sqlite3.node" ] && \
       ! find node_modules/sqlite3/lib/binding -name "node_sqlite3.node" 2>/dev/null | grep -q .; then
        echo "Installing sqlite3 native module (prebuild-install will download prebuilt binary)..."
        (cd node_modules/sqlite3 && npm run install)
    fi
fi
