#!/usr/bin/env bash
set -euo pipefail

# Check if --force flag is provided
force=false
if [[ "$@" == *"--force"* ]]; then
    force=true
fi

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"


# Set the TB_VERSION variable from .tinyenv file
source "$SCRIPT_DIR/../.tinyenv"
export TB_VERSION
echo "Using TB_VERSION: $TB_VERSION"
version=$TB_VERSION

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

echo "Proceeding with unsafe redeploy for version ${version}..."

# Store the lists to avoid multiple calls
datasources=$(tb datasource ls)
pipes=$(tb pipe ls)

# Define arrays for each type of resource
materialized_views=(
    "_mv_hits"
)

data_pipes=(
    "mv_hits",
    "filtered_sessions"
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

# Function to update version in files
update_file_versions() {
    local new_version=$1
    echo "Updating version to ${new_version} in all files..."

    # Update pipe files
    for pipe in "${endpoint_pipes[@]}" "${data_pipes[@]}"; do
        pipe_file="pipes/${pipe}.pipe"
        if [ -f "$pipe_file" ]; then
            echo "Updating version in ${pipe_file}"
            sed -i "1s/^VERSION .*$/VERSION ${new_version}/" "$pipe_file"
        fi
    done

    # Update datasource files
    for mv in "${materialized_views[@]}"; do
        ds_file="datasources/${mv}.datasource"
        if [ -f "$ds_file" ]; then
            echo "Updating version in ${ds_file}"
            sed -i "1s/^VERSION .*$/VERSION ${new_version}/" "$ds_file"
        fi
    done

    # Update include files
    for inc in "${include_files[@]}"; do
        inc_file="pipes/${inc}.incl"
        if [ -f "$inc_file" ]; then
            echo "Updating version in ${inc_file}"
            sed -i "1s/^VERSION .*$/VERSION ${new_version}/" "$inc_file"
        fi
    done
}

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

# Update version in all files to the specified version
update_file_versions "$version"

# Push all the changes
tb push --force --populate
