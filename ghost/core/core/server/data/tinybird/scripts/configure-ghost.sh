#!/bin/bash
# This script is used to get the admin token, workspace ID, and tracker token from an instance of Tinybird Local
## It is used in the e2e test CI workflow to configure Ghost to use the Tinybird local instance
## It can also be used locally to configure Ghost to use a tinybird local instance

# Get workspace admin token
## This token is available in the Tinybird Local instance without authentication
WORKSPACE_ADMIN_TOKEN=$(curl -s http://localhost:7181/tokens | jq -r ".admin_token")
export TINYBIRD_WORKSPACE_ADMIN_TOKEN="$WORKSPACE_ADMIN_TOKEN"

# Get the admin token from the Tinybird CLI
## This is different from the workspace admin token
ADMIN_TOKEN=$(tb token ls --match "admin token" | grep "token:" | awk -F'token: ' '{print $2}')
export TINYBIRD_ADMIN_TOKEN="$ADMIN_TOKEN"

# Get the tracker token from the Tinybird CLI
TRACKER_TOKEN=$(tb token ls --match "tracker" | grep "token:" | awk -F'token: ' '{print $2}')
export TINYBIRD_TRACKER_TOKEN="$TRACKER_TOKEN"

# Get the workspace ID from the Tinybird CLI
WORKSPACE_ID=$(tb info | grep "workspace_id:" | awk '{print $2}')
export TINYBIRD_WORKSPACE_ID="$WORKSPACE_ID"

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