#!/bin/bash

# benchmark-top-pages.sh - Compare performance of api_top_pages vs api_top_pages_v3
#
# Usage: ./benchmark-top-pages.sh [iterations]
#
# Prerequisites: yarn dev:analytics

set -e

# Configuration
TB_HOST="${TB_HOST:-http://localhost:7181}"
ITERATIONS="${1:-5}"

# Get site_uuid and token from Docker
echo "============================================"
echo "Tinybird Top Pages Benchmark"
echo "============================================"

# Get token
TB_TOKEN=$(docker run --rm -v ghost-dev_shared-config:/config alpine cat /config/.env.tinybird 2>/dev/null | grep TINYBIRD_ADMIN_TOKEN | cut -d= -f2)
if [ -z "$TB_TOKEN" ]; then
    echo "Error: Could not find Tinybird token. Is yarn dev:analytics running?"
    exit 1
fi

# Get site_uuid - first try from analytics data, fallback to Ghost database
SITE_UUID=$(curl -s -H "Authorization: Bearer $TB_TOKEN" \
    "${TB_HOST}/v0/sql?q=SELECT%20site_uuid%20FROM%20_mv_hits%20WHERE%20site_uuid%20!=%20'mock_site_uuid'%20LIMIT%201" | tr -d '\n')
if [ -z "$SITE_UUID" ] || [ "$SITE_UUID" = "" ]; then
    # Fallback to Ghost database
    SITE_UUID=$(docker exec ghost-dev-mysql mysql -uroot -proot ghost_dev -N -e "SELECT value FROM settings WHERE \`key\`='db_hash'" 2>/dev/null | tr -d '\r\n')
fi
if [ -z "$SITE_UUID" ]; then
    echo "Error: Could not get site_uuid"
    exit 1
fi

# Calculate date range (last 30 days)
DATE_TO=$(date +%Y-%m-%d)
DATE_FROM=$(date -v-30d +%Y-%m-%d 2>/dev/null || date -d '30 days ago' +%Y-%m-%d)
TIMEZONE="Etc/UTC"

echo "Site UUID: $SITE_UUID"
echo "Date Range: $DATE_FROM to $DATE_TO"
echo "Iterations: $ITERATIONS"
echo "============================================"
echo ""

# Check data volume
echo "Checking data volume..."
DATA_COUNT=$(curl -s -H "Authorization: Bearer $TB_TOKEN" \
    "${TB_HOST}/v0/pipes/api_top_pages.json?site_uuid=${SITE_UUID}&date_from=${DATE_FROM}&date_to=${DATE_TO}&timezone=${TIMEZONE}&limit=1" \
    | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('statistics',{}).get('rows_read', 'unknown'))" 2>/dev/null || echo "unknown")
echo "Rows in date range: ~${DATA_COUNT}"
echo ""

# Benchmark function
benchmark() {
    local version=$1
    local label=$2
    local endpoint="api_top_pages"

    if [ -n "$version" ]; then
        endpoint="${endpoint}_${version}"
    fi

    local url="${TB_HOST}/v0/pipes/${endpoint}.json?site_uuid=${SITE_UUID}&date_from=${DATE_FROM}&date_to=${DATE_TO}&timezone=${TIMEZONE}"

    echo "Testing: $label"
    echo "Endpoint: $endpoint"

    local times=()
    local total_time=0

    for i in $(seq 1 $ITERATIONS); do
        # Use curl timing
        local result=$(curl -s -w "%{time_total}" -o /tmp/tb_response.json \
            -H "Authorization: Bearer $TB_TOKEN" \
            "$url")

        local time_ms=$(python3 -c "print(int(float('$result') * 1000))")
        times+=($time_ms)
        total_time=$((total_time + time_ms))

        # Check for errors
        local error=$(python3 -c "import json; d=json.load(open('/tmp/tb_response.json')); print(d.get('error',''))" 2>/dev/null)
        if [ -n "$error" ]; then
            echo "  Iteration $i: ERROR - $error"
        else
            local stats=$(python3 -c "
import json
d=json.load(open('/tmp/tb_response.json'))
rows=len(d.get('data',[]))
stats=d.get('statistics',{})
rows_read=stats.get('rows_read',0)
print(f'{rows}|{rows_read}')" 2>/dev/null)
            local rows=$(echo "$stats" | cut -d'|' -f1)
            local rows_read=$(echo "$stats" | cut -d'|' -f2)
            printf "  Iteration %d: %4dms | %d results | %s rows scanned\n" "$i" "$time_ms" "$rows" "$rows_read"
        fi
    done

    if [ ${#times[@]} -gt 0 ]; then
        local avg=$((total_time / ${#times[@]}))

        # Calculate min/max
        local min=${times[0]}
        local max=${times[0]}
        for t in "${times[@]}"; do
            [ $t -lt $min ] && min=$t
            [ $t -gt $max ] && max=$t
        done

        # Get final stats for summary
        local final_rows_read=$(python3 -c "import json; print(json.load(open('/tmp/tb_response.json')).get('statistics',{}).get('rows_read',0))" 2>/dev/null)

        echo "  ----------------------------------------"
        printf "  Avg: %dms | Min: %dms | Max: %dms | Rows: %s\n" "$avg" "$min" "$max" "$final_rows_read"
    fi
    echo ""
}

# Store results for comparison
V1_STATS=""
V3_STATS=""

run_benchmark() {
    local version=$1
    local label=$2
    benchmark "$version" "$label"

    # Capture stats from last run
    local stats=$(python3 -c "
import json
d=json.load(open('/tmp/tb_response.json'))
s=d.get('statistics',{})
print(f\"{s.get('elapsed',0)*1000:.1f}|{s.get('rows_read',0)}\")" 2>/dev/null)

    if [ "$version" = "" ]; then
        V1_STATS="$stats"
    else
        V3_STATS="$stats"
    fi
}

# Run benchmarks
run_benchmark "" "api_top_pages (unversioned)"
run_benchmark "v3" "api_top_pages_v3 (daily MV)"

# Summary comparison
echo "============================================"
echo "Performance Comparison Summary"
echo "============================================"

V1_TIME=$(echo "$V1_STATS" | cut -d'|' -f1)
V1_ROWS=$(echo "$V1_STATS" | cut -d'|' -f2)
V3_TIME=$(echo "$V3_STATS" | cut -d'|' -f1)
V3_ROWS=$(echo "$V3_STATS" | cut -d'|' -f2)

python3 << PYTHON_SUMMARY
v1_time = float("$V1_TIME")
v1_rows = int("$V1_ROWS")
v3_time = float("$V3_TIME")
v3_rows = int("$V3_ROWS")

print(f"api_top_pages:    {v1_time:>8.1f}ms | {v1_rows:>12,} rows scanned")
print(f"api_top_pages_v3: {v3_time:>8.1f}ms | {v3_rows:>12,} rows scanned")
print()

if v1_time > 0 and v3_time > 0:
    time_ratio = v1_time / v3_time
    if time_ratio >= 1:
        print(f"Speed:      v3 is {time_ratio:.1f}x faster")
    else:
        print(f"Speed:      v1 is {1/time_ratio:.1f}x faster")

if v1_rows > 0 and v3_rows > 0:
    rows_ratio = v1_rows / v3_rows
    print(f"Efficiency: v3 scans {rows_ratio:.1f}x fewer rows")
PYTHON_SUMMARY

echo "============================================"

# Cleanup
rm -f /tmp/tb_response.json
