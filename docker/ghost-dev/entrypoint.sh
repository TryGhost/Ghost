#!/bin/bash

set -euo pipefail

# Configure Ghost to use Tinybird Local
# Sources tokens from /mnt/shared-config/.env.tinybird created by tb-cli
if [ -f /mnt/shared-config/.env.tinybird ]; then
    source /mnt/shared-config/.env.tinybird
    if [ -n "${TINYBIRD_WORKSPACE_ID:-}" ] && [ -n "${TINYBIRD_ADMIN_TOKEN:-}" ]; then
        export tinybird__workspaceId="$TINYBIRD_WORKSPACE_ID"
        export tinybird__adminToken="$TINYBIRD_ADMIN_TOKEN"
        echo "Tinybird configuration loaded successfully"
    else
        echo "WARNING: Tinybird not enabled: Missing required environment variables in .env.tinybird" >&2
    fi
else
    echo "WARNING: Tinybird not enabled: .env.tinybird file not found at /mnt/shared-config/.env.tinybird" >&2
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

# Execute the CMD
exec "$@"

