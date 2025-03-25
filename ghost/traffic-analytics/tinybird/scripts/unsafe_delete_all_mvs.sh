#!/usr/bin/env bash
set -euo pipefail

# Install jq if not installed
if ! command -v jq &> /dev/null
then
    echo "jq could not be found, installing..."
    apt-get update && apt-get install -y jq
fi

# Check if --force flag is provided
force=false
if [[ "$@" == *"--force"* ]]; then
    force=true
fi

# Get current branch info
branch_info=$(tb branch current)

# Check if 'main' and 'production_stats' are both present in the output
if echo "$branch_info" | grep -q "main" && echo "$branch_info" | grep -q "production_stats"; then
    if [ "$force" = false ]; then
        echo "🚨 ERROR: Attempting to run unsafe_redeploy on main branch in production_stats workspace."
        echo "If you're sure you want to do this, run the script with the --force flag."
        exit 1
    else
        echo "⚠️  WARNING: Running unsafe_redeploy on main branch in production_stats workspace with --force flag."
    fi
fi

# Function to safely remove a resource
safe_delete_mv() {
    local name=$1
    local version=${2:-""}  # Make version optional with empty default

    if [[ "${name}" != _mv* ]]; then
        echo "Skipping non-materialized view: ${name}"
        return
    fi

    if echo "$datasources" | grep -q "${name}"; then
        if [ -z "$version" ]; then
            echo "Removing materialized view: ${name}"
            tb datasource rm "${name}" --yes || true
        else
            echo "Removing materialized view: ${name}__v${version}"
            tb datasource rm "${name}__v${version}" --yes || true
        fi
    else
        echo "Materialized view not found: ${name}__v${version}"
    fi
}

# Get all pipes as a JSON object
datasources=$(tb datasource ls --format=json)

# Parse and filter materialized views (datasources starting with _mv)
echo "Deleting materialized views:"
echo "$datasources" | jq -r '.[] | select(.name | startswith("_mv")) | if .version then "safe_delete_mv \"\(.name)\" \"\(.version)\"" else "safe_delete_mv \"\(.name)\"" end' 2>/dev/null || \
    echo "$datasources" | jq -r '.datasources[] | select(.name | startswith("_mv")) | if .version then "safe_delete_mv \"\(.name)\" \"\(.version)\"" else "safe_delete_mv \"\(.name)\"" end' | while read -r cmd; do
    eval "$cmd"
done
