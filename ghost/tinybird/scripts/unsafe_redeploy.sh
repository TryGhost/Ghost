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

# Remove our materialized views and their pipes
tb datasource rm analytics_pages_mv  --yes
tb datasource rm analytics_sessions_mv  --yes
tb datasource rm analytics_sources_mv  --yes
tb pipe rm analytics_pages  --yes
tb pipe rm analytics_sessions  --yes
tb pipe rm analytics_sources  --yes
tb pipe rm analytics_hits  --yes

# Remove all the endpoints
tb pipe rm pipes/kpis.pipe  --yes
tb pipe rm pipes/top_browsers.pipe  --yes
tb pipe rm pipes/top_devices.pipe  --yes
tb pipe rm pipes/top_locations.pipe  --yes
tb pipe rm pipes/top_pages.pipe  --yes
tb pipe rm pipes/top_sources.pipe  --yes
tb pipe rm pipes/trend.pipe  --yes

# Push all the changes
tb push --force --populate
