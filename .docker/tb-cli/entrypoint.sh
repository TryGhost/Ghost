#!/bin/bash

# Entrypoint script for the Tinybird CLI service in compose.yml
## This script deploys the Tinybird files to Tinybird local, then retrieves important configuration values
## and writes them to a .env file in /ghost/core/core/server/data/tinybird. This .env file is used by
## Ghost and the Analytics service to automatically configure their connections to Tinybird Local

set -euo pipefail

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
ADMIN_TOKEN=$(curl --fail --show-error -s -H "Authorization: Bearer $WORKSPACE_TOKEN" http://tinybird-local:7181/v0/tokens | jq -r '.tokens[] | select(.name == "admin token") | .token')


# Check if admin token is valid
if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
    echo "Error: Failed to get admin token from Tinybird API. Please ensure Tinybird is properly configured." >&2
    exit 1
fi

# Get the tracker token from the Tinybird API
TRACKER_TOKEN=$(curl --fail --show-error -s -H "Authorization: Bearer $WORKSPACE_TOKEN" http://tinybird-local:7181/v0/tokens | jq -r '.tokens[] | select(.name == "tracker") | .token')

# Check if tracker token is valid
if [ -z "$TRACKER_TOKEN" ] || [ "$TRACKER_TOKEN" = "null" ]; then
    echo "Error: Failed to get tracker token from Tinybird API. Please ensure Tinybird is properly configured." >&2
    exit 1
fi

# Write environment variables to .env file
ENV_FILE="/mnt/shared-config/.env.tinybird"
TMP_ENV_FILE="/mnt/shared-config/.env.tinybird.tmp"

echo "Writing Tinybird configuration to $ENV_FILE..."

cat > "$TMP_ENV_FILE" << EOF
TINYBIRD_WORKSPACE_ID=$WORKSPACE_ID
TINYBIRD_ADMIN_TOKEN=$ADMIN_TOKEN
TINYBIRD_TRACKER_TOKEN=$TRACKER_TOKEN
EOF

if [ $? -eq 0 ]; then
    mv "$TMP_ENV_FILE" "$ENV_FILE"
    if [ $? -eq 0 ]; then
        echo "Successfully wrote Tinybird configuration to $ENV_FILE"
    else
        echo "Error: Failed to move temporary file to $ENV_FILE" >&2
        exit 1
    fi
else
    echo "Error: Failed to create temporary configuration file" >&2
    rm -f "$TMP_ENV_FILE"
    exit 1
fi

exec "$@"
