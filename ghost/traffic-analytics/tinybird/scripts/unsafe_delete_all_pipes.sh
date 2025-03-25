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
safe_delete() {
    local type=$1
    local name=$2
    local version=$3

    if [ "$type" == "pipe" ]; then
        if echo "$pipes" | grep -q "${name}"; then
            echo "Removing pipe: ${name}__v${version}"
            tb pipe rm "${name}__v${version}" --yes || true
        else
            echo "Pipe not found: ${name}__v${version}"
        fi
    elif [ "$type" == "datasource" ]; then
        if echo "$datasources" | grep -q "${name}"; then
            echo "Removing datasource: ${name}__v${version}"
            tb datasource rm "${name}__v${version}" --yes || true
        else
            echo "Datasource not found: ${name}__v${version}"
        fi
    fi
}

# Get all pipes as a JSON object
pipes=$(tb pipe ls --format=json)

echo "$pipes"

# Parse the value of the 'pipes' key into its own variable
pipe_names=$(echo "$pipes" | jq -r '.[] | .name' 2>/dev/null || echo "$pipes" | jq -r '.pipes[]')

# Iterate over each pipe and call safe_delete
echo "$pipes" | jq -r '.[] | "safe_delete \"pipe\" \"\(.name)\" \"\(.version)\""' 2>/dev/null || \
    echo "$pipes" | jq -r '.pipes[] | "safe_delete \"pipe\" \"\(.name)\" \"\(.version)\""' | while read -r cmd; do
    eval "$cmd"
done
