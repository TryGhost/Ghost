#!/usr/bin/env bash

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Set the TB_VERSION variable from .tinyenv file
# This ensures the script can run independently if needed,
# although entrypoint.sh usually handles this.
if [ -f "$SCRIPT_DIR/../.tinyenv" ]; then
    source "$SCRIPT_DIR/../.tinyenv"
    export TB_VERSION
else
    echo "Warning: .tinyenv file not found."
fi

# Generate a unique branch name using a timestamp
BRANCH_NAME="dev_$(date +%s)"

echo "Attempting to create branch: $BRANCH_NAME..."

# Attempt to create the branch and check for errors
if ! tb branch create "$BRANCH_NAME"; then
    # Using ANSI escape codes for red color
    echo -e "\033[0;31m🚨 ERROR: Failed to create branch $BRANCH_NAME. Exiting.\033[0m" >&2
    exit 1
fi

# Commented out the verbose success message
# echo "Successfully created branch: $BRANCH_NAME"

# Output ONLY the branch name to stdout on success
echo "$BRANCH_NAME"
