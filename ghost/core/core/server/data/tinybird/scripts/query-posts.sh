#!/bin/bash

# Ghost Posts Query CLI
# Usage: ./query-posts.sh [options]

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
QUERY_TYPE="all"
FORMAT="table"
LIMIT=""
STATUS=""
TYPE=""

# Help function
show_help() {
    echo -e "${GREEN}Ghost Posts Query CLI${NC}"
    echo ""
    echo "Usage: $0 [options]"
    echo ""
    echo "Options:"
    echo "  -t, --type <query_type>    Query type: all, uuids, titles, details (default: all)"
    echo "  -f, --format <format>      Output format: table, json, csv, uuids-only (default: table)"
    echo "  -l, --limit <number>       Limit number of results"
    echo "  -s, --status <status>      Filter by status: published, draft, scheduled, sent"
    echo "  -p, --post-type <type>     Filter by type: post, page"
    echo "  -h, --help                 Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                         # Show all posts in table format"
    echo "  $0 -t uuids                # Show only UUIDs"
    echo "  $0 -f json -l 10           # Show 10 posts in JSON format"
    echo "  $0 -s published -p post    # Show only published posts"
    echo "  $0 -f uuids-only           # Show only UUIDs, one per line"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -t|--type)
            QUERY_TYPE="$2"
            shift 2
            ;;
        -f|--format)
            FORMAT="$2"
            shift 2
            ;;
        -l|--limit)
            LIMIT="$2"
            shift 2
            ;;
        -s|--status)
            STATUS="$2"
            shift 2
            ;;
        -p|--post-type)
            TYPE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Build the Node.js query based on options
build_query() {
    # Determine the correct require path based on GHOST_CORE_DIR
    if [[ "${GHOST_CORE_DIR}" == "../.." ]]; then
        local base_query="const knex = require('./db/connection');"
    else
        local base_query="const knex = require('./core/server/data/db/connection');"
    fi
    local select_clause=""
    local where_clause=""
    local order_clause="orderBy('created_at', 'desc')"
    local limit_clause=""
    
    # Build SELECT clause based on query type
    case $QUERY_TYPE in
        "uuids")
            select_clause="select('uuid')"
            ;;
        "titles")
            select_clause="select('uuid', 'title', 'status')"
            ;;
        "details")
            select_clause="select('uuid', 'title', 'slug', 'status', 'type', 'created_at', 'published_at')"
            ;;
        *)
            select_clause="select('uuid', 'title', 'status', 'type', 'created_at')"
            ;;
    esac
    
    # Build WHERE clause
    local conditions=()
    if [[ -n "$STATUS" ]]; then
        conditions+=("where('status', '$STATUS')")
    fi
    if [[ -n "$TYPE" ]]; then
        conditions+=("where('type', '$TYPE')")
    fi
    
    # Build LIMIT clause
    if [[ -n "$LIMIT" ]]; then
        limit_clause="limit($LIMIT)"
    fi
    
    # Combine all clauses
    local query_parts=("knex('posts')" "$select_clause")
    for condition in "${conditions[@]}"; do
        query_parts+=("$condition")
    done
    query_parts+=("$order_clause")
    if [[ -n "$limit_clause" ]]; then
        query_parts+=("$limit_clause")
    fi
    
    # Join with dots
    local full_query=$(IFS='.'; echo "${query_parts[*]}")
    
    # Build the complete Node.js command based on format
    case $FORMAT in
        "json")
            echo "$base_query $full_query.then(posts => { console.log(JSON.stringify(posts, null, 2)); knex.destroy(); }).catch(err => { console.error('Error:', err); knex.destroy(); });"
            ;;
        "csv")
            echo "$base_query $full_query.then(posts => { if(posts.length === 0) { console.log('No posts found'); } else { const headers = Object.keys(posts[0]); console.log(headers.join(',')); posts.forEach(p => console.log(headers.map(h => p[h] || '').join(','))); } knex.destroy(); }).catch(err => { console.error('Error:', err); knex.destroy(); });"
            ;;
        "uuids-only")
            echo "$base_query $full_query.then(posts => { posts.forEach(p => console.log(p.uuid)); knex.destroy(); }).catch(err => { console.error('Error:', err); knex.destroy(); });"
            ;;
        *)
            echo "$base_query $full_query.then(posts => { console.log('Found ' + posts.length + ' posts:\\n'); posts.forEach((p, i) => { console.log((i + 1) + '. ' + p.title); console.log('   UUID: ' + p.uuid); if(p.status) console.log('   Status: ' + p.status); if(p.type) console.log('   Type: ' + p.type); if(p.created_at) console.log('   Created: ' + p.created_at); if(p.published_at) console.log('   Published: ' + p.published_at); console.log(''); }); knex.destroy(); }).catch(err => { console.error('Error:', err); knex.destroy(); });"
            ;;
    esac
}

# Check if we can access the ghost/core directory
# Determine the correct path based on current working directory
if [[ $(pwd) == *"/ghost/core/core/server/data/tinybird"* ]]; then
    # Running from tinybird directory or subdirectory - go up to ghost/core
    GHOST_CORE_DIR="../../../../../.."
else
    # Running from root directory via yarn
    GHOST_CORE_DIR="./ghost/core"
fi

if [[ ! -f "${GHOST_CORE_DIR}/core/server/data/db/connection.js" ]]; then
    # Try direct path from scripts directory
    if [[ -f "../../db/connection.js" ]]; then
        GHOST_CORE_DIR="../.."
    else
        echo -e "${RED}Error: Cannot find Ghost database connection${NC}"
        echo -e "${YELLOW}Current directory: $(pwd)${NC}"
        echo -e "${YELLOW}Tried: ${GHOST_CORE_DIR}/core/server/data/db/connection.js${NC}"
        echo -e "${YELLOW}Tried: ../../db/connection.js${NC}"
        exit 1
    fi
fi

# Build and execute the query
echo -e "${BLUE}Querying Ghost posts...${NC}"
QUERY=$(build_query)

# Need to run from ghost/core directory where dependencies are properly installed
ORIGINAL_DIR=$(pwd)
cd "$GHOST_CORE_DIR" # Go to ghost/core directory

node -e "$QUERY"

# Return to original directory
cd "$ORIGINAL_DIR" 