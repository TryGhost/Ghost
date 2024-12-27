#!/usr/bin/env bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Create a branch and test it

# Create a variable with a timestamp to use as a random name for the branch
BRANCH_NAME="TEST_$(date +%s)"

# Check for -y flag
force_delete=false
for arg in "$@"; do
    if [[ "$arg" == "-y" ]]; then
        force_delete=true
        break
    fi
done

# Allow version to be passed in or default to 0
export TB_VERSION=${TB_VERSION:-0}

# Attempt to build the project  and check for errors
if ! tb build; then
    echo "🚨 ERROR: Failed to build the project. Exiting."
    exit 1
fi

# Run the scripts using their full paths
"$SCRIPT_DIR/append_fixtures.sh"
"$SCRIPT_DIR/exec_test.sh"