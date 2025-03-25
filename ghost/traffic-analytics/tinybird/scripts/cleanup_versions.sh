#!/usr/bin/env bash
set -euo pipefail

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Define arrays for each type of resource
materialized_views=(
    "_mv_hits"
)

data_pipes=(
    "mv_hits"
)

endpoint_pipes=(
    "api_kpis"
    "api_top_browsers"
    "api_top_devices"
    "api_top_locations"
    "api_top_os"
    "api_top_pages"
    "api_top_sources"
)

# Function to safely remove a resource
safe_remove() {
    local type=$1
    local name=$2
    local version=$3
    
    if [ "$type" == "pipe" ]; then
        echo "Removing pipe: ${name}__v${version}"
        tb pipe rm "${name}__v${version}" --yes || true
    elif [ "$type" == "datasource" ]; then
        echo "Removing datasource: ${name}__v${version}"
        tb datasource rm "${name}__v${version}" --yes || true
    fi
}

# Function to remove all resources for a specific version
remove_version() {
    local version=$1
    echo "🔄 Removing all resources for version ${version}..."
    
    # Remove endpoint pipes
    for pipe in "${endpoint_pipes[@]}"; do
        safe_remove "pipe" "$pipe" "$version"
    done

    # Remove materialized views
    for mv in "${materialized_views[@]}"; do
        safe_remove "datasource" "$mv" "$version"
    done

    # Remove data pipes
    for pipe in "${data_pipes[@]}"; do
        safe_remove "pipe" "$pipe" "$version"
    done
}

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
        echo "🚨 ERROR: Attempting to run cleanup on main branch in production_stats workspace."
        echo "If you're sure you want to do this, run the script with the --force flag."
        exit 1
    else
        echo "⚠️  WARNING: Running cleanup on main branch in production_stats workspace with --force flag."
    fi
fi

# Remove resources for versions 1-4
for version in {1..4}; do
    remove_version "$version"
done

echo "✅ Cleanup complete for versions 1-4" 