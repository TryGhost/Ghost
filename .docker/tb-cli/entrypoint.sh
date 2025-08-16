#!/bin/bash
set -euo pipefail

echo "Starting tb-cli"

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

# Get the tracker token from the Tinybird API
TRACKER_TOKEN=$(curl -s -H "Authorization: Bearer $WORKSPACE_TOKEN" http://tinybird-local:7181/v0/tokens | jq -r '.tokens[] | select(.name == "tracker") | .token')

# Check if tracker token is valid
if [ -z "$TRACKER_TOKEN" ] || [ "$TRACKER_TOKEN" = "null" ]; then
    echo "Error: Failed to get tracker token from Tinybird API. Please ensure Tinybird is properly configured." >&2
    exit 1
fi

rm /home/tinybird/.env || true
touch /home/tinybird/.env
echo "TINYBIRD_WORKSPACE_ID=$WORKSPACE_ID" >> /home/tinybird/.env
echo "TINYBIRD_ADMIN_TOKEN=$ADMIN_TOKEN" >> /home/tinybird/.env
echo "TINYBIRD_TRACKER_TOKEN=$TRACKER_TOKEN" >> /home/tinybird/.env

exec "$@"
