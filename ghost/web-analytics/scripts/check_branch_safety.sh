#!/usr/bin/env bash

# Ensures pipeline errors are propagated
set -o pipefail

# Get the directory where this script is located
# (Assuming .tinyb is in the parent directory relative to this script)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

# Color definitions
COLOR_RED='\033[0;31m'
COLOR_NC='\033[0m' # No Color

# Function for colored error messages
echo_error() {
    echo -e "${COLOR_RED}🚨 SAFETY ERROR: $@${COLOR_NC}" >&2
}

# --- Main Check Logic ---

current_branch_name=""
tinyb_file="$PARENT_DIR/.tinyb"

if [ ! -f "$tinyb_file" ]; then
    echo_error ".tinyb file not found at $tinyb_file."
    echo_error "Cannot determine current branch."
    exit 1
fi

# Extract the name value from the JSON-like structure in .tinyb
current_branch_name=$(grep '"name":' "$tinyb_file" | cut -d : -f 2 | cut -d '"' -f 2)

if [ -z "$current_branch_name" ]; then
    echo_error "Could not extract branch name from $tinyb_file."
    exit 1
fi

# The actual safety check
if [[ "$current_branch_name" == "dedicated_staging_stats" || "$current_branch_name" == "dedicated_production_stats" ]]; then
    echo_error "Current branch '$current_branch_name' is a protected branch."
    echo_error "Operation aborted for safety."
    exit 1 # Exit with non-zero status indicating failure/unsafe
fi

# If we reach here, the branch is considered safe
exit 0
