#!/bin/bash

# Runs `yarn install` if `yarn.lock` has changed to avoid a full `docker build` when changing branches/dependencies
## Dockerfile calculates a hash and stores it in `.yarnhash/yarn.lock.md5`
## compose.yml mounts a named volume to persist the `.yarnhash` directory
yarn_lock_hash_file_path=".yarnhash/yarn.lock.md5"
if [ -f "$yarn_lock_hash_file_path" ]; then
    stored_hash=$(cat "$yarn_lock_hash_file_path")
    calculated_hash=$(md5sum yarn.lock | awk '{print $1}')
    if [ "$calculated_hash" != "$stored_hash" ]; then
        echo "INFO: yarn.lock has changed. Running yarn install..."
        yarn install
    fi
else
    echo "WARNING: yarn.lock hash file ($yarn_lock_hash_file_path) not found. Running yarn install as a precaution."
    yarn install
fi

yarn nx reset

# Execute the CMD
exec "$@"
