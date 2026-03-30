#!/bin/bash
set -euo pipefail

# Install dependencies with pnpm's default script policy.
# Root package.json controls the allowlist via pnpm.onlyBuiltDependencies.

PNPM_VERSION="${PNPM_VERSION:-10.33.0}"
max_attempts=4

corepack enable
corepack prepare "pnpm@${PNPM_VERSION}" --activate

install_dependencies() {
    pnpm install --frozen-lockfile --prefer-offline "$@"
}

for attempt in $(seq 1 "$max_attempts"); do
    echo "Installing dependencies... (attempt ${attempt}/${max_attempts})"

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

sqlite3_dir="$(
    pnpm --filter ./ghost/core exec node <<'NODE'
const path = require('path');

try {
    process.stdout.write(path.dirname(require.resolve('sqlite3/package.json')));
} catch (error) {
    process.exit(1);
}
NODE
)"

# Check if sqlite3 binary already exists (from cache or previous build)
if [ -n "$sqlite3_dir" ] && [ -d "$sqlite3_dir" ]; then
    # Check both possible binary locations:
    # 1. build/Release/node_sqlite3.node (built by node-gyp rebuild)
    # 2. lib/binding/*/node_sqlite3.node (downloaded by prebuild-install)
    if [ -f "$sqlite3_dir/build/Release/node_sqlite3.node" ]; then
        echo "✓ sqlite3 binary found in build/Release/, skipping rebuild"
    elif find "$sqlite3_dir/lib/binding" -name "node_sqlite3.node" 2>/dev/null | grep -q .; then
        echo "✓ sqlite3 prebuilt binary found in lib/binding/, skipping rebuild"
    else
        echo "Building sqlite3 native module..."
        (cd "$sqlite3_dir" && npm run install)
    fi
else
    echo "⚠ sqlite3 package not found in workspace install"
fi
