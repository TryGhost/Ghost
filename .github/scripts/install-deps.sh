#!/bin/bash
set -euo pipefail

# Install dependencies with --ignore-scripts and selectively run sqlite3 postinstall
# This maintains security while ensuring sqlite3 binaries are built when needed

echo "Installing dependencies with --ignore-scripts..."
yarn install --frozen-lockfile --prefer-offline --ignore-scripts "$@"

# Determine if sqlite3 is needed
# sqlite3 is only needed when using SQLite as the database (optional dependency)
# Check environment variables that indicate SQLite usage
NEED_SQLITE3=false

# Check if DB environment variable indicates SQLite usage
if [ "${DB:-}" = "sqlite3" ]; then
    NEED_SQLITE3=true
    echo "DB=sqlite3 detected, sqlite3 binary will be built if needed"
fi

# Check if database client config indicates SQLite
if [ -n "${database__client:-}" ] && [ "${database__client}" = "sqlite3" ]; then
    NEED_SQLITE3=true
    echo "database__client=sqlite3 detected, sqlite3 binary will be built if needed"
fi

# In Docker builds, always build sqlite3 since dev environment may use it
# Check if we're in a Docker build context (Dockerfile sets WORKDIR to /home/ghost)
if [ "${PWD:-}" = "/home/ghost" ] || [ -f "/.dockerenv" ] || [ -n "${DOCKER_BUILD:-}" ]; then
    NEED_SQLITE3=true
    echo "Docker build detected, sqlite3 binary will be built if needed"
fi

# If sqlite3 is not needed, skip the build entirely
if [ "$NEED_SQLITE3" = "false" ]; then
    echo "✓ Skipping sqlite3 build (not needed for this job)"
    exit 0
fi

# Check if sqlite3 binary already exists (from cache or previous build)
if [ -d "node_modules/sqlite3" ]; then
    # Check both possible binary locations:
    # 1. build/Release/node_sqlite3.node (built by node-gyp rebuild)
    # 2. lib/binding/*/node_sqlite3.node (downloaded by prebuild-install)
    if [ -f "node_modules/sqlite3/build/Release/node_sqlite3.node" ]; then
        echo "✓ sqlite3 binary found in build/Release/, skipping rebuild"
    elif find node_modules/sqlite3/lib/binding -name "node_sqlite3.node" 2>/dev/null | grep -q .; then
        echo "✓ sqlite3 prebuilt binary found in lib/binding/, skipping rebuild"
    else
        echo "Building sqlite3 native module..."
        (cd node_modules/sqlite3 && npm run install)
    fi
else
    echo "⚠ sqlite3 package not found in node_modules"
fi
