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
tb push --only-changes --force --populate
