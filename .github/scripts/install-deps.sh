#!/bin/bash
set -euo pipefail

# Install dependencies with --ignore-scripts and selectively run better-sqlite3 postinstall
# This maintains security while ensuring better-sqlite3 binaries are built when needed

echo "Installing dependencies with --ignore-scripts..."
yarn install --frozen-lockfile --prefer-offline --ignore-scripts "$@"

# Check if better-sqlite3 binary already exists (from cache or previous build)
if [ -d "node_modules/better-sqlite3" ]; then
    # Check if binary exists in build/Release/ (built by node-gyp or downloaded by prebuild-install)
    if [ -f "node_modules/better-sqlite3/build/Release/better_sqlite3.node" ]; then
        echo "✓ better-sqlite3 binary found in build/Release/, skipping rebuild"
    else
        echo "Building better-sqlite3 native module..."
        (cd node_modules/better-sqlite3 && npm run install)
    fi
else
    echo "⚠ better-sqlite3 package not found in node_modules"
fi
