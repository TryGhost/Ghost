#!/bin/bash

# compare-top-pages.sh - Validate api_top_pages vs api_top_pages_v3 results
#
# Usage: ./compare-top-pages.sh [-l limit] [-d days] [-t tolerance] [-v]
#
# Prerequisites: yarn dev:analytics
#
# Expected: v3 counts may be 1-2 lower for pages where sessions cross midnight
# at date boundaries. This is correct behavior - v1 over-counts by including
# page views outside the date range when sessions span multiple days.

set -e

# Default configuration
TB_HOST="${TB_HOST:-http://localhost:7181}"
LIMIT=50
DAYS=30
TOLERANCE=5
VERBOSE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -l|--limit)
            LIMIT="$2"
            shift 2
            ;;
        -d|--days)
            DAYS="$2"
            shift 2
            ;;
        -t|--tolerance)
            TOLERANCE="$2"
            shift 2
            ;;
        -v|--verbose)
            VERBOSE=true
            shift
            ;;
        -h|--help)
            head -20 "$0" | tail -17
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

echo "============================================"
echo "Tinybird Top Pages Comparison"
echo "============================================"

# Get token
TB_TOKEN=$(docker run --rm -v ghost-dev_shared-config:/config alpine cat /config/.env.tinybird 2>/dev/null | grep TINYBIRD_ADMIN_TOKEN | cut -d= -f2)
if [ -z "$TB_TOKEN" ]; then
    echo "Error: Could not find Tinybird token. Is yarn dev:analytics running?"
    exit 1
fi

# Get site_uuid from analytics data (check what's actually in the data)
SITE_UUID=$(curl -s -H "Authorization: Bearer $TB_TOKEN" \
    "${TB_HOST}/v0/sql?q=SELECT%20site_uuid%20FROM%20_mv_hits%20WHERE%20site_uuid%20!=%20'mock_site_uuid'%20LIMIT%201" | tr -d '\n')

if [ -z "$SITE_UUID" ] || [ "$SITE_UUID" = "" ]; then
    echo "Error: Could not get site_uuid from analytics data"
    exit 1
fi

# Calculate date range
DATE_TO=$(date +%Y-%m-%d)
DATE_FROM=$(date -v-${DAYS}d +%Y-%m-%d 2>/dev/null || date -d "${DAYS} days ago" +%Y-%m-%d)
TIMEZONE="Etc/UTC"

echo "Site UUID: $SITE_UUID"
echo "Date Range: $DATE_FROM to $DATE_TO"
echo "Limit: $LIMIT results"
echo "Tolerance: ${TOLERANCE}%"
echo "============================================"
echo ""

# Create temp files
V1_RESPONSE=$(mktemp)
V3_RESPONSE=$(mktemp)

cleanup() {
    rm -f "$V1_RESPONSE" "$V3_RESPONSE"
}
trap cleanup EXIT

# Fetch from both endpoints
echo "Fetching from api_top_pages..."
curl -s -H "Authorization: Bearer $TB_TOKEN" \
    "${TB_HOST}/v0/pipes/api_top_pages.json?site_uuid=${SITE_UUID}&date_from=${DATE_FROM}&date_to=${DATE_TO}&timezone=${TIMEZONE}&limit=${LIMIT}" \
    > "$V1_RESPONSE"

echo "Fetching from api_top_pages_v3..."
curl -s -H "Authorization: Bearer $TB_TOKEN" \
    "${TB_HOST}/v0/pipes/api_top_pages_v3.json?site_uuid=${SITE_UUID}&date_from=${DATE_FROM}&date_to=${DATE_TO}&timezone=${TIMEZONE}&limit=${LIMIT}" \
    > "$V3_RESPONSE"

# Check for errors
V1_ERROR=$(python3 -c "import json; d=json.load(open('$V1_RESPONSE')); print(d.get('error',''))" 2>/dev/null)
V3_ERROR=$(python3 -c "import json; d=json.load(open('$V3_RESPONSE')); print(d.get('error',''))" 2>/dev/null)

if [ -n "$V1_ERROR" ]; then
    echo "Error from api_top_pages: $V1_ERROR"
    exit 1
fi

if [ -n "$V3_ERROR" ]; then
    echo "Error from api_top_pages_v3: $V3_ERROR"
    exit 1
fi

echo ""

# Compare results using Python
export V1_RESPONSE V3_RESPONSE TOLERANCE VERBOSE
python3 << 'PYTHON_SCRIPT'
import json
import sys
import os

v1_file = os.environ['V1_RESPONSE']
v3_file = os.environ['V3_RESPONSE']
tolerance = float(os.environ['TOLERANCE'])
verbose = os.environ['VERBOSE'] == 'true'

with open(v1_file) as f:
    v1_data = json.load(f)

with open(v3_file) as f:
    v3_data = json.load(f)

v1_results = {(r['pathname'], r['post_uuid']): r['visits'] for r in v1_data['data']}
v3_results = {(r['pathname'], r['post_uuid']): r['visits'] for r in v3_data['data']}

# Statistics
v1_stats = v1_data.get('statistics', {})
v3_stats = v3_data.get('statistics', {})

print("=== Performance Statistics ===")
print(f"api_top_pages:    {v1_stats.get('elapsed', 0)*1000:.2f}ms | {v1_stats.get('rows_read', 0):,} rows read")
print(f"api_top_pages_v3: {v3_stats.get('elapsed', 0)*1000:.2f}ms | {v3_stats.get('rows_read', 0):,} rows read")
print()

# Combine all keys
all_keys = set(v1_results.keys()) | set(v3_results.keys())

differences = []
matches = []
only_in_v1 = []
only_in_v3 = []

for key in all_keys:
    pathname, post_uuid = key
    v1_val = v1_results.get(key)
    v3_val = v3_results.get(key)

    if v1_val is None:
        only_in_v3.append((pathname, post_uuid, v3_val))
    elif v3_val is None:
        only_in_v1.append((pathname, post_uuid, v1_val))
    else:
        diff = abs(v1_val - v3_val)
        diff_pct = (diff / max(v1_val, 1)) * 100

        if diff > 0:
            differences.append({
                'pathname': pathname,
                'post_uuid': post_uuid,
                'v1': v1_val,
                'v3': v3_val,
                'diff': diff,
                'diff_pct': diff_pct
            })
        else:
            matches.append({
                'pathname': pathname,
                'post_uuid': post_uuid,
                'visits': v1_val
            })

# Sort differences by absolute difference
differences.sort(key=lambda x: x['diff'], reverse=True)

print("=== Comparison Results ===")
print(f"Total pages in v1: {len(v1_results)}")
print(f"Total pages in v3: {len(v3_results)}")
print(f"Exact matches: {len(matches)}")
print(f"Differences: {len(differences)}")
print(f"Only in v1: {len(only_in_v1)}")
print(f"Only in v3: {len(only_in_v3)}")
print()

# Check for significant differences
significant = [d for d in differences if d['diff_pct'] > tolerance]

if differences:
    print("=== Differences Found ===")
    print(f"{'Pathname':<60} {'V1':>8} {'V3':>8} {'Diff':>8} {'Diff%':>8}")
    print("-" * 96)

    for d in differences[:20]:  # Show top 20 differences
        pathname = d['pathname'][:58] if len(d['pathname']) > 58 else d['pathname']
        marker = " *" if d['diff_pct'] > tolerance else ""
        print(f"{pathname:<60} {d['v1']:>8} {d['v3']:>8} {d['diff']:>+8} {d['diff_pct']:>7.2f}%{marker}")

    if len(differences) > 20:
        print(f"... and {len(differences) - 20} more differences")
    print()
    print("(* = exceeds tolerance threshold)")

if only_in_v1:
    print()
    print("=== Pages only in api_top_pages (v1) ===")
    for pathname, post_uuid, visits in only_in_v1[:10]:
        print(f"  {pathname:<60} visits: {visits}")
    if len(only_in_v1) > 10:
        print(f"  ... and {len(only_in_v1) - 10} more")

if only_in_v3:
    print()
    print("=== Pages only in api_top_pages_v3 ===")
    for pathname, post_uuid, visits in only_in_v3[:10]:
        print(f"  {pathname:<60} visits: {visits}")
    if len(only_in_v3) > 10:
        print(f"  ... and {len(only_in_v3) - 10} more")

if verbose and matches:
    print()
    print("=== Exact Matches ===")
    for m in matches[:20]:
        print(f"  {m['pathname']:<60} visits: {m['visits']}")
    if len(matches) > 20:
        print(f"  ... and {len(matches) - 20} more matches")

print()
print("============================================")

# Check for unexpected differences (v3 should always be <= v1)
unexpected = [d for d in differences if d['v3'] > d['v1']]

# Exit status based on differences
if unexpected:
    print(f"FAIL: {len(unexpected)} pages have v3 > v1 (unexpected - v3 should never exceed v1)")
    sys.exit(1)
elif significant:
    print(f"WARN: {len(significant)} pages exceed {tolerance}% tolerance (but v3 <= v1 as expected)")
    print("      Small differences are expected due to cross-midnight session handling.")
    sys.exit(0)
elif differences:
    print(f"OK: {len(differences)} pages have minor differences (within {tolerance}% tolerance)")
    print("    v3 counts are lower as expected (more accurate date filtering).")
    sys.exit(0)
else:
    print("PASS: All results match exactly!")
    sys.exit(0)
PYTHON_SCRIPT
