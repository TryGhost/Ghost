#!/bin/bash

# This script is used to get the admin token and workspace ID from an instance of Tinybird Local
## It is used in the e2e test CI workflow to configure Ghost to use the Tinybird local instance
## It can also be used locally to do the same thing.

# Get workspace admin token
## This token is available in the Tinybird Local instance without authentication
WORKSPACE_ADMIN_TOKEN=$(curl -s http://localhost:7181/tokens | jq -r ".admin_token")
export TB_TOKEN="$WORKSPACE_ADMIN_TOKEN"

# Get the admin token from the Tinybird CLI
## This is different from the workspace admin token
ADMIN_TOKEN=$(tb token ls | grep "| admin token" | awk -F'|' '{print $4}' | xargs)
export TB_ADMIN_TOKEN="$ADMIN_TOKEN"

# Get the workspace ID from the Tinybird CLI
WORKSPACE_ID=$(tb info | grep "workspace_id:" | awk '{print $2}')
export TB_WORKSPACE_ID="$WORKSPACE_ID"

export tinybird__adminToken="$TB_ADMIN_TOKEN"
export tinybird__workspaceId="$TB_WORKSPACE_ID"
export tinybird__stats__endpoint="http://localhost:7181"

# If running in GitHub Actions, also export to GITHUB_ENV
if [ -n "$GITHUB_ENV" ]; then
    echo "tinybird__adminToken=$TB_ADMIN_TOKEN" >> $GITHUB_ENV
    echo "tinybird__workspaceId=$TB_WORKSPACE_ID" >> $GITHUB_ENV
    echo "tinybird__stats__endpoint=http://localhost:7181" >> $GITHUB_ENV
fi