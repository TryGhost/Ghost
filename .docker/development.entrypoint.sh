#!/bin/bash

set -euo pipefail

# Runs `yarn install` if `yarn.lock` has changed to avoid a full `docker build` when changing branches/dependencies
## Dockerfile calculates a hash and stores it in `.yarnhash/yarn.lock.md5`
## compose.yml mounts a named volume to persist the `.yarnhash` directory
(
    cd /home/ghost
    yarn_lock_hash_file_path=".yarnhash/yarn.lock.md5"
    calculated_hash=$(md5sum yarn.lock | awk '{print $1}')

    if [ -f "$yarn_lock_hash_file_path" ]; then
        stored_hash=$(cat "$yarn_lock_hash_file_path")
        if [ "$calculated_hash" != "$stored_hash" ]; then
            echo "INFO: yarn.lock has changed. Running yarn install..."
            yarn install --frozen-lockfile
            mkdir -p .yarnhash
            echo "$calculated_hash" > "$yarn_lock_hash_file_path"
        fi
    else
        echo "WARNING: yarn.lock hash file ($yarn_lock_hash_file_path) not found. Running yarn install as a precaution."
        yarn install --frozen-lockfile
        mkdir -p .yarnhash
        echo "$calculated_hash" > "$yarn_lock_hash_file_path"
    fi
)

# Clean Nx setup for Nx 21.2 with database-backed cache
yarn nx reset --onlyDaemon
yarn nx daemon --start

# Initialize database schema to prevent race conditions between services
echo "INFO: Initializing Nx cache database schema..."
yarn nx show projects > /dev/null 2>&1 || echo "WARNING: Failed to initialize Nx cache database"

# Execute the CMD
exec "$@"
