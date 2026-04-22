#!/bin/bash

set -euo pipefail

# Runs `pnpm install` if `pnpm-lock.yaml` has changed to avoid a full `docker build` when changing branches/dependencies
## Dockerfile calculates a hash and stores it in `.pnpmhash/pnpm-lock.yaml.md5`
## compose.yml mounts a named volume to persist the `.pnpmhash` directory
(
    cd /home/ghost
    pnpm_lock_hash_file_path=".pnpmhash/pnpm-lock.yaml.md5"
    calculated_hash=$(md5sum pnpm-lock.yaml | awk '{print $1}')

    if [ -f "$pnpm_lock_hash_file_path" ]; then
        stored_hash=$(cat "$pnpm_lock_hash_file_path")
        if [ "$calculated_hash" != "$stored_hash" ]; then
            echo "INFO: pnpm-lock.yaml has changed. Running pnpm install..."
            pnpm install
            mkdir -p .pnpmhash
            echo "$calculated_hash" > "$pnpm_lock_hash_file_path"
        fi
    else
        echo "WARNING: pnpm-lock.yaml hash file ($pnpm_lock_hash_file_path) not found. Running pnpm install as a precaution."
        pnpm install
        mkdir -p .pnpmhash
        echo "$calculated_hash" > "$pnpm_lock_hash_file_path"
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

pnpm nx reset

# Execute the CMD
exec "$@"
