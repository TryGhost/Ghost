#!/bin/bash

# Function to prompt Tinybird branch information
prompt_tb() {
    if [ -e ".tinyb" ]; then
        TB_CHAR=$'\U1F423'
        branch_name=$(grep '"name":' .tinyb | cut -d : -f 2 | cut -d '"' -f 2)
        region=$(grep '"host":' .tinyb | cut -d / -f 3 | cut -d . -f 2 | cut -d : -f 1)
        if [ "$region" = "tinybird" ]; then
            region=$(grep '"host":' .tinyb | cut -d / -f 3 | cut -d . -f 1)
        fi
        TB_BRANCH="${TB_CHAR}tb:${region}=>${branch_name}"
    else
        TB_BRANCH=''
    fi

    echo $TB_BRANCH
}

# Function to run SQL queries from files
tbsql() {
    if [ -z "$1" ]; then
        echo "Usage: tbsql <filename without .sql>"
        return 1
    fi

    local sql_file="/ghost/ghost/web-analytics/sql/$1.sql"
    if [ ! -f "$sql_file" ]; then
        echo "Error: SQL file not found: $sql_file"
        return 1
    fi

    tb sql "$(cat $sql_file)"
}

# Export the prompt with Tinybird branch information
export PS1="\w\$(prompt_tb)\$ "

exec "$@"
