#!/bin/bash
set -euo pipefail

# This script is used to get important values from the Tinybird Local container, and setup Ghost's config
## It is used in the e2e test CI workflow to configure Ghost to use the Tinybird local instance
## It can also be used locally to configure Ghost to use a tinybird local instance

# Store tb info output as JSON to parse multiple values
## This includes the workspace ID and a workspace token we can use to authenticate with the Tinybird API
TB_INFO=$(tb --output json info)

# Get the workspace ID from the JSON output
WORKSPACE_ID=$(echo "$TB_INFO" | jq -r '.local.workspace_id')

# Check if workspace ID is valid
if [ -z "$WORKSPACE_ID" ] || [ "$WORKSPACE_ID" = "null" ]; then
    echo "Error: Failed to get workspace ID from Tinybird. Please ensure Tinybird is running and initialized." >&2
    exit 1
fi

export TINYBIRD_WORKSPACE_ID="$WORKSPACE_ID"

WORKSPACE_TOKEN=$(echo "$TB_INFO" | jq -r '.local.token')

# Check if workspace token is valid
if [ -z "$WORKSPACE_TOKEN" ] || [ "$WORKSPACE_TOKEN" = "null" ]; then
    echo "Error: Failed to get workspace token from Tinybird. Please ensure Tinybird is running and initialized." >&2
    exit 1
fi

# Get the admin token from the Tinybird API
## This is different from the workspace admin token
ADMIN_TOKEN=$(curl -s -H "Authorization: Bearer $WORKSPACE_TOKEN" http://localhost:7181/v0/tokens | jq -r '.tokens[] | select(.name == "admin token") | .token')

# Check if admin token is valid
if [ -z "$ADMIN_TOKEN" ] || [ "$ADMIN_TOKEN" = "null" ]; then
    echo "Error: Failed to get admin token from Tinybird API. Please ensure Tinybird is properly configured." >&2
    exit 1
fi

export TINYBIRD_ADMIN_TOKEN="$ADMIN_TOKEN"

# Get the tracker token from the Tinybird API
TRACKER_TOKEN=$(curl -s -H "Authorization: Bearer $WORKSPACE_TOKEN" http://localhost:7181/v0/tokens | jq -r '.tokens[] | select(.name == "tracker") | .token')

# Check if tracker token is valid
if [ -z "$TRACKER_TOKEN" ] || [ "$TRACKER_TOKEN" = "null" ]; then
    echo "Error: Failed to get tracker token from Tinybird API. Please ensure Tinybird is properly configured." >&2
    exit 1
fi

export TINYBIRD_TRACKER_TOKEN="$TRACKER_TOKEN"

# Export Ghost configuration as environment variables
export tinybird__adminToken="$TINYBIRD_ADMIN_TOKEN"
export tinybird__workspaceId="$TINYBIRD_WORKSPACE_ID"
export tinybird__stats__endpoint="http://localhost:7181"
export tinybird__tracker__endpoint="http://localhost:3000/api/v1/page_hit"

# If running in GitHub Actions, also export to GITHUB_ENV
if [ -n "$GITHUB_ENV" ]; then
    echo "tinybird__adminToken=$TINYBIRD_ADMIN_TOKEN" >> $GITHUB_ENV
    echo "tinybird__workspaceId=$TINYBIRD_WORKSPACE_ID" >> $GITHUB_ENV
    echo "tinybird__stats__endpoint=$tinybird__stats__endpoint" >> $GITHUB_ENV
    echo "TINYBIRD_TRACKER_TOKEN=$TINYBIRD_TRACKER_TOKEN" >> $GITHUB_ENV
    echo "tinybird__tracker__endpoint=$tinybird__tracker__endpoint" >> $GITHUB_ENV
fi
