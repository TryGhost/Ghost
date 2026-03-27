#!/bin/bash
set -euo pipefail

# Install dependencies with --ignore-scripts and selectively run sqlite3 postinstall
# This maintains security while ensuring sqlite3 binaries are built when needed

max_attempts=4

install_dependencies() {
    yarn install --frozen-lockfile --prefer-offline --ignore-scripts "$@"
}

for attempt in $(seq 1 "$max_attempts"); do
    echo "Installing dependencies with --ignore-scripts... (attempt ${attempt}/${max_attempts})"

    if install_dependencies "$@"; then
        break
    fi

    if [ "$attempt" -eq "$max_attempts" ]; then
        echo "Dependency installation failed after ${max_attempts} attempts"
        exit 1
    fi

    sleep_seconds=$((attempt * 15))
    echo "::warning::Dependency installation failed, retrying in ${sleep_seconds} seconds..."
    sleep "$sleep_seconds"
done

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
