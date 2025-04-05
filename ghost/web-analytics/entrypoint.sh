#!/bin/bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set the TB_VERSION variable from .tinyenv file
source "$SCRIPT_DIR/.tinyenv"
export TB_VERSION
echo "Using TB_VERSION: $TB_VERSION"

# Function to prompt Tinybird branch information
prompt_tb() {
    if [ -e ".tinyb" ]; then
        branch_name=$(grep '"name":' .tinyb | cut -d : -f 2 | cut -d '"' -f 2)
        region=$(grep '"host":' .tinyb | cut -d / -f 3 | cut -d . -f 2 | cut -d : -f 1)
        if [ "$region" = "tinybird" ]; then
            region=$(grep '"host":' .tinyb | cut -d / -f 3 | cut -d . -f 1)
        fi
        TB_BRANCH=":tb=>${branch_name}"
    else
        TB_BRANCH=''
    fi

    echo $TB_BRANCH
}

# Function to run SQL queries from files
tbsql() {
    local format="csv"
    local query_file=""
    local valid_formats="json csv human"

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --format)
                if [[ ! " $valid_formats " =~ $2 ]]; then
                    echo "Error: Invalid format '$2'. Valid formats are: $valid_formats"
                    return 1
                fi
                format="$2"
                shift 2
                ;;
            *)
                query_file="$1"
                shift
                ;;
        esac
    done

    if [ -z "$query_file" ]; then
        echo "Usage: tbsql [--format <json|csv|human>] <filename without .sql>"
        return 1
    fi

    # Get the directory where this script is located
    SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
    local sql_file="$SCRIPT_DIR/sql/$query_file.sql"

    if [ ! -f "$sql_file" ]; then
        echo "Error: SQL file not found: $sql_file"
        return 1
    fi

    # Read SQL file and process environment variables with bash parameter expansion
    local query
    # Use eval to process the SQL content with bash parameter expansion
    eval "query=\"$(cat "$sql_file")\""
    tb sql --format="$format" "$query"
}

# Export the prompt with Tinybird branch information
export PS1="\w\$(prompt_tb)\$ "

exec "$@"
