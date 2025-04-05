#!/usr/bin/env bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Create a variable with a timestamp to use as a random name for the branch
BRANCH_NAME="TEST_$(date +%s)"

# Attempt to create the branch and check for errors
if ! tb branch create "$BRANCH_NAME"; then
    echo "🚨 ERROR: Failed to create branch $BRANCH_NAME. Exiting."
    exit 1
fi

# Deploy the current changes to the branch
if ! tb deploy; then
    echo "🚨 ERROR: Failed to deploy changes to branch. Exiting."
    exit 1
fi

# Append fixture data
"$SCRIPT_DIR/append_fixtures.sh"
