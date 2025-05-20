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

yarn nx reset

# Execute the CMD
exec "$@"
