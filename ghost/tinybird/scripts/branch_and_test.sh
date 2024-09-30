#!/usr/bin/env bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Create a branch and test it

## Create a variable with a timestamp to use as a random name for the branch
BRANCH_NAME="TEST_$(date +%s)"

tb branch create $BRANCH_NAME

# Run the scripts using their full paths
"$SCRIPT_DIR/append_fixtures.sh"
"$SCRIPT_DIR/exec_test.sh"

tb branch rm $BRANCH_NAME --yes
