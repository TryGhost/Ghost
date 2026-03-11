#!/bin/bash
set -euo pipefail

# Install dependencies with --ignore-scripts and selectively run sqlite3 postinstall
# This maintains security while ensuring sqlite3 binaries are built when needed
#
# Note: sqlite3 is an optional dependency. We build it explicitly for:
# - Test environments (NODE_ENV=testing)
# - Development environments (Docker builds, local dev)
#
# For other environments (production, MySQL-only CI jobs), sqlite3 is not built.
# If you need sqlite3 in those environments, you'll need to build it manually:
#   cd node_modules/sqlite3 && npm run install

echo "Installing dependencies with --ignore-scripts..."
yarn install --frozen-lockfile --prefer-offline --ignore-scripts "$@"

# Build sqlite3 for test and development environments
# These environments default to SQLite as the database
BUILD_SQLITE3=false

# In CI, build sqlite3 by default (unless explicitly MySQL-only)
# This covers browser tests and other test jobs that may need sqlite3
# Note: NODE_ENV may not be set when this script runs during cache restore
if [ -n "${CI:-}" ] && [ "${DB:-}" != "mysql8" ]; then
    BUILD_SQLITE3=true
    echo "CI environment detected (not MySQL-only), sqlite3 will be built if needed"
fi

# Test environments use SQLite by default (config.testing.json, config.testing-browser.json)
if [ "${NODE_ENV:-}" = "testing" ] || [ "${NODE_ENV:-}" = "testing-browser" ]; then
    BUILD_SQLITE3=true
    echo "Test environment detected (NODE_ENV=${NODE_ENV}), sqlite3 will be built if needed"
fi

# Development environment uses SQLite by default (config.development.json)
# Local dev setups use NODE_ENV=development
if [ "${NODE_ENV:-}" = "development" ]; then
    BUILD_SQLITE3=true
    echo "Development environment detected (NODE_ENV=development), sqlite3 will be built if needed"
fi

# Docker builds (ghost-dev Dockerfile sets WORKDIR to /home/ghost during build)
# Only check PWD, not /.dockerenv (which may exist in CI runners)
if [ "${PWD:-}" = "/home/ghost" ]; then
    BUILD_SQLITE3=true
    echo "Docker build detected (PWD=/home/ghost), sqlite3 will be built if needed"
fi

# Explicitly requested SQLite (e.g., DB=sqlite3 in CI)
if [ "${DB:-}" = "sqlite3" ]; then
    BUILD_SQLITE3=true
    echo "DB=sqlite3 detected, sqlite3 will be built if needed"
fi

# Skip build if not needed
if [ "$BUILD_SQLITE3" = "false" ]; then
    echo "✓ Skipping sqlite3 build (not needed for this environment)"
    exit 0
fi

# Check if sqlite3 binary already exists (from cache or previous build)
if [ ! -d "node_modules/sqlite3" ]; then
    echo "⚠ sqlite3 package not found in node_modules"
    exit 0
fi

# Check for existing binary in build/Release/ (built by node-gyp)
if [ -f "node_modules/sqlite3/build/Release/node_sqlite3.node" ]; then
    echo "✓ sqlite3 binary found in build/Release/, skipping rebuild"
    exit 0
fi

# Check for prebuilt binary in lib/binding/ (downloaded by prebuild-install)
if find node_modules/sqlite3/lib/binding -name "node_sqlite3.node" 2>/dev/null | grep -q .; then
    echo "✓ sqlite3 prebuilt binary found in lib/binding/, skipping rebuild"
    exit 0
fi

# Note: prebuild-install may fail to find binaries on Node 22 due to N-API version detection bug
# (see https://github.com/TryGhost/node-sqlite3/issues/1824)
# In that case, it will fall back to building from source
echo "Building sqlite3 native module (prebuild-install will try prebuilt binaries first)..."
(cd node_modules/sqlite3 && npm run install)
