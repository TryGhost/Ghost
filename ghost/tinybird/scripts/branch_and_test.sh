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

# Attempt to create the branch and check for errors
if ! tb branch create "$BRANCH_NAME"; then
    echo "🚨 ERROR: Failed to create branch $BRANCH_NAME. Exiting."
    exit 1
fi

# Run the scripts using their full paths
"$SCRIPT_DIR/append_fixtures.sh"
"$SCRIPT_DIR/exec_test.sh"

# Conditional deletion based on the -y flag or user prompt
if [ "$force_delete" = true ]; then
    tb branch rm "$BRANCH_NAME" --yes
    echo "Branch $BRANCH_NAME removed without prompt."
else
    read -p "Do you want to delete the branch $BRANCH_NAME? (y/n): " choice
    if [[ "$choice" == "y" || "$choice" == "Y" ]]; then
        tb branch rm "$BRANCH_NAME" --yes
        echo "Branch $BRANCH_NAME removed."
    else
        echo "Branch $BRANCH_NAME kept."
    fi
fi
