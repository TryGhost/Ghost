#!/bin/bash

# Start tinybird
docker compose up tinybird -d --wait

# Get workspace admin token
WORKSPACE_ADMIN_TOKEN=$(curl -s http://localhost:7181/tokens | jq -r ".admin_token")
export TB_TOKEN="$WORKSPACE_ADMIN_TOKEN"

# Build project (create tracker token)
cd ghost/core/core/server/data/tinybird 
tb build

# Get tracker and admin tokens using CLI
TRACKER_TOKEN=$(tb token ls | grep "| tracker" | awk -F'|' '{print $4}' | xargs)
ADMIN_TOKEN=$(tb token ls | grep "| admin token" | awk -F'|' '{print $4}' | xargs)

# Get workspace ID
WORKSPACE_ID=$(tb info | grep "workspace_id:" | awk '{print $2}')

# Export admin token and workspace ID for local shell
export tinybird__adminToken="$ADMIN_TOKEN"
export tinybird__workspaceId="$WORKSPACE_ID"
export tinybird__stats__endpoint="http://localhost:7181"
export tinybird__tracker__endpoint="http://localhost:3000/tb/web_analytics"
export tinybird__tracker__datasource="analytics_events"


# Start analytics service with tracker token
TINYBIRD_TRACKER_TOKEN="$TRACKER_TOKEN" docker compose up analytics-service -d

# Return to repo root
cd "$(git rev-parse --show-toplevel)"

echo "Tinybird setup complete"