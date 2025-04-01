#!/bin/bash

# Exit on error
set -e

# Ensure we're authenticated
if ! tb workspace ls &>/dev/null; then
    echo "❌ Not authenticated with Tinybird. Please run 'tb auth' first"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check required dependencies
for cmd in tb jq git; do
    if ! command_exists "$cmd"; then
        echo "❌ Required command '$cmd' not found"
        exit 1
    fi
done

# Display current workspace and branch
echo "🔍 Current context:"
echo "  Workspace: $(tb workspace ls | grep "True" | head -n1 | awk -F'|' '{print $2}' | xargs)"
echo "  Current branch:"
tb branch current

# Delete all pipes that have a version less than 7 or no version
echo "🗑️ Deleting pipes with version < 7 or no version..."
tb pipe ls --format json | \
  jq -r '.pipes[] | select(.version < 7 or .version == "" or (.name | endswith("_dup"))) | if .version == "" then .name else "\(.name)__v\(.version)" end' | \
  while read -r pipe_id; do
    if [ ! -z "$pipe_id" ]; then
      echo "Deleting pipe: $pipe_id"
      tb pipe rm "$pipe_id" --yes
    fi
  done

# Delete all datasources except analytics_events and _mv_hits__v7
echo "🗑️ Deleting non-essential datasources..."
tb datasource ls --format json | \
  jq -r '.datasources[] | select(.name != "analytics_events" and .name + "__v" + (.version|tostring) != "_mv_hits__v7") | "\(.name)__v\(.version)"' | \
  while read -r ds_id; do
    if [ ! -z "$ds_id" ]; then
      echo "Deleting datasource: $ds_id"
      tb datasource rm "$ds_id" --yes
    fi
  done

echo "✅ Deployment completed successfully!"

echo "Current pipes after cleanup:"
tb pipe ls

echo "Current datasources after cleanup:"
tb datasource ls

echo "Updating the git commit metadata..."
# Only update git commit metadata if we're on the main branch
CURRENT_BRANCH=$(tb branch current | grep "|" | awk -F'|' '{print $2}' | xargs)
if [ "$CURRENT_BRANCH" = "main" ]; then
    CURRENT_COMMIT=$(git rev-parse HEAD)
    echo "On main branch, updating git commit metadata to: $CURRENT_COMMIT"
    tb init --override-commit "$CURRENT_COMMIT"
else
    echo "Not on main branch ($CURRENT_BRANCH), skipping git commit metadata update"
fi
