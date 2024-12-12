#!/usr/bin/env bash
set -euo pipefail

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

echo "Proceeding with unsafe redeploy..."

# Store the lists to avoid multiple calls
datasources=$(tb datasource ls)
pipes=$(tb pipe ls)

# Define arrays for each type of resource
materialized_views=(
    "analytics_pages_mv"
    "analytics_sessions_mv"
    "analytics_sources_mv"
)

data_pipes=(
    "analytics_pages"
    "analytics_sessions"
    "analytics_sources"
    "analytics_hits"
)

endpoint_pipes=(
    "kpis"
    "top_browsers"
    "top_devices"
    "top_locations"
    "top_pages"
    "top_sources"
    "trend"
)

# Remove materialized views
for mv in "${materialized_views[@]}"; do
    if echo "$datasources" | grep -q "$mv"; then
        tb datasource rm "$mv" --yes
    fi
done

# Remove data pipes
for pipe in "${data_pipes[@]}"; do
    if echo "$pipes" | grep -q "$pipe"; then
        tb pipe rm "$pipe" --yes
    fi
done

# Remove endpoint pipes
for pipe in "${endpoint_pipes[@]}"; do
    if echo "$pipes" | grep -q "$pipe"; then
        tb pipe rm "$pipe" --yes
    fi
done

# Push all the changes
tb push --force --populate
