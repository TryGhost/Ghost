#!/bin/bash
# This script is used to get the admin token, workspace ID, and tracker token from an instance of Tinybird Local
## It is used in the e2e test CI workflow to configure Ghost to use the Tinybird local instance
## It can also be used locally to configure Ghost to use a tinybird local instance

# Store tb info output as JSON to parse multiple values
TB_INFO=$(tb --output json info)

# Get the workspace ID from the JSON output
WORKSPACE_ID=$(echo "$TB_INFO" | jq -r '.local.workspace_id')
export TINYBIRD_WORKSPACE_ID="$WORKSPACE_ID"

WORKSPACE_TOKEN=$(echo "$TB_INFO" | jq -r '.local.token')

# Get the admin token from the Tinybird API
## This is different from the workspace admin token
ADMIN_TOKEN=$(curl -s -H "Authorization: Bearer $WORKSPACE_TOKEN" http://localhost:7181/v0/tokens | jq -r '.tokens[] | select(.name == "admin token") | .token')
export TINYBIRD_ADMIN_TOKEN="$ADMIN_TOKEN"

# Get the tracker token from the Tinybird API
TRACKER_TOKEN=$(curl -s -H "Authorization: Bearer $WORKSPACE_TOKEN" http://localhost:7181/v0/tokens | jq -r '.tokens[] | select(.name == "tracker") | .token')
export TINYBIRD_TRACKER_TOKEN="$TRACKER_TOKEN"

# Export Ghost configuration as environment variables
export tinybird__adminToken="$TINYBIRD_ADMIN_TOKEN"
export tinybird__workspaceId="$TINYBIRD_WORKSPACE_ID"
export tinybird__stats__endpoint="http://localhost:7181"

# If running in GitHub Actions, also export to GITHUB_ENV
if [ -n "$GITHUB_ENV" ]; then
    echo "tinybird__adminToken=$TINYBIRD_ADMIN_TOKEN" >> $GITHUB_ENV
    echo "tinybird__workspaceId=$TINYBIRD_WORKSPACE_ID" >> $GITHUB_ENV
    echo "tinybird__stats__endpoint=http://localhost:7181" >> $GITHUB_ENV
    echo "TINYBIRD_TRACKER_TOKEN=$TINYBIRD_TRACKER_TOKEN" >> $GITHUB_ENV
fi