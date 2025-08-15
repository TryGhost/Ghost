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


pushd /home/ghost/ghost/core/core/server/data/tinybird
# Build the Tinybird files
tb --local build

# Get the Tinybird workspace ID and admin token from the Tinybird Local container
TB_INFO=$(tb --output json info)

# Get the workspace ID from the JSON output
WORKSPACE_ID=$(echo "$TB_INFO" | jq -r '.local.workspace_id')

# Check if workspace ID is valid
if [ -z "$WORKSPACE_ID" ] || [ "$WORKSPACE_ID" = "null" ]; then
    echo "Error: Failed to get workspace ID from Tinybird. Please ensure Tinybird is running and initialized." >&2
    exit 1
fi

WORKSPACE_TOKEN=$(echo "$TB_INFO" | jq -r '.local.token')

# Check if workspace token is valid
if [ -z "$WORKSPACE_TOKEN" ] || [ "$WORKSPACE_TOKEN" = "null" ]; then
    echo "Error: Failed to get workspace token from Tinybird. Please ensure Tinybird is running and initialized." >&2
    exit 1
fi
#
# Get the admin token from the Tinybird API
## This is different from the workspace admin token
ADMIN_TOKEN=$(curl -s -H "Authorization: Bearer $WORKSPACE_TOKEN" http://tinybird-local:7181/v0/tokens | jq -r '.tokens[] | select(.name == "admin token") | .token')

# Check if admin token is valid
if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
    echo "Error: Failed to get admin token from Tinybird API. Please ensure Tinybird is properly configured." >&2
    exit 1
fi
popd

export tinybird__workspaceId="$WORKSPACE_ID"
export tinybird__adminToken="$ADMIN_TOKEN"


yarn nx reset

# Execute the CMD
exec "$@"
