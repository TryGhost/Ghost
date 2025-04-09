#!/usr/bin/env bash

# Ensures pipeline errors are propagated
set -o pipefail

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
SCRIPTS_SUBDIR="$SCRIPT_DIR"

# Color definitions
COLOR_RED='\033[0;31m'
COLOR_GREEN='\033[0;32m'
COLOR_BLUE='\033[0;34m'
COLOR_NC='\033[0m' # No Color

# Function for colored error messages
echo_error() {
    echo -e "${COLOR_RED}🚨 ERROR: $@${COLOR_NC}" >&2
}

# Function for informational messages
echo_info() {
    echo -e "${COLOR_BLUE}ℹ️  INFO: $@${COLOR_NC}"
}

# Function for success messages
echo_success() {
    echo -e "${COLOR_GREEN}✅ SUCCESS: $@${COLOR_NC}"
}

# --- Main Logic ---

# 1. Perform safety check first
echo_info "Performing branch safety check..."
if ! "$SCRIPTS_SUBDIR/check_branch_safety.sh"; then
    # Error message is printed by check_branch_safety.sh
    echo_error "Branch safety check failed. Cannot delete protected branch."
    exit 1
fi
# No success message needed here, check_branch_safety is silent on success within other scripts

# 2. Get the current branch name from .tinyb
current_branch_name=""
tinyb_file="$PARENT_DIR/.tinyb"

if [ ! -f "$tinyb_file" ]; then
    echo_error ".tinyb file not found at $tinyb_file."
    echo_error "Cannot determine current branch to delete."
    exit 1
fi

current_branch_name=$(grep '"name":' "$tinyb_file" | cut -d : -f 2 | cut -d '"' -f 2)

if [ -z "$current_branch_name" ]; then
    echo_error "Could not extract branch name from $tinyb_file."
    exit 1
fi

echo_info "Attempting to delete current branch: '$current_branch_name'..."

# 3. Run the delete command (requires user confirmation)
tb branch rm "$current_branch_name"
delete_exit_code=$?

if [ $delete_exit_code -ne 0 ]; then
    echo_error "Failed to delete branch '$current_branch_name' (or operation cancelled). Exit code: $delete_exit_code"
    exit 1
fi

# Note: We don't have a definitive success message here, as the user might cancel.
# The tb command output itself serves as confirmation.
echo_info "If confirmed, branch '$current_branch_name' should now be deleted."

exit 0
