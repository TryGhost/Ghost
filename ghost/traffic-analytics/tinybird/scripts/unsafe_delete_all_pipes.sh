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
safe_delete_pipe() {
    local name=$1
    local version=${2:-""}  # Make version optional with empty default

        if echo "$pipes" | grep -q "${name}"; then
            if [ -z "$version" ]; then
                echo "Removing pipe: ${name}"
                tb pipe rm "${name}" --yes || true
            else
                echo "Removing pipe: ${name}__v${version}"
                tb pipe rm "${name}__v${version}" --yes || true
            fi
        else
            echo "Pipe not found: ${name}"
        fi
}

# Get all pipes as a JSON object
pipes=$(tb pipe ls --format=json)

echo "$pipes"

# Parse the value of the 'pipes' key into its own variable
pipe_names=$(echo "$pipes" | jq -r '.[] | .name' 2>/dev/null || echo "$pipes" | jq -r '.pipes[]')

# Iterate over each pipe and call safe_delete
echo "$pipes" | jq -r '.[] | if .version then "safe_delete_pipe \"\(.name)\" \"\(.version)\"" else "safe_delete_pipe \"\(.name)\"" end' 2>/dev/null || \
    echo "$pipes" | jq -r '.pipes[] | if .version then "safe_delete_pipe \"\(.name)\" \"\(.version)\"" else "safe_delete_pipe \"\(.name)\"" end' | while read -r cmd; do
    eval "$cmd"
done
