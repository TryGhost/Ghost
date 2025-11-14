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

# Configure Ghost to use Tinybird Local
if [ -f /mnt/shared-config/.env.tinybird ]; then
    source /mnt/shared-config/.env.tinybird
    if [ -n "${TINYBIRD_WORKSPACE_ID:-}" ] && [ -n "${TINYBIRD_ADMIN_TOKEN:-}" ]; then
        export tinybird__workspaceId="$TINYBIRD_WORKSPACE_ID"
        export tinybird__adminToken="$TINYBIRD_ADMIN_TOKEN"
    else
        echo "WARNING: Tinybird not enabled: Missing required environment variables"
    fi
else
    echo "WARNING: Tinybird not enabled: .env file not found"
fi

# Configure Stripe webhook secret
if [ -f /mnt/shared-config/.env.stripe ]; then
    source /mnt/shared-config/.env.stripe
    if [ -n "${STRIPE_WEBHOOK_SECRET:-}" ]; then
        export WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
        echo "Stripe webhook secret configured successfully"
    else
        echo "WARNING: Stripe webhook secret not found in shared config"
    fi
fi

yarn nx reset

# Execute the CMD
exec "$@"
