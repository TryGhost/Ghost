#!/bin/bash

# Exit on error
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
# Get the web-analytics root directory (parent of scripts)
ROOT_DIR="$( cd "$SCRIPT_DIR/.." && pwd )"

# Initialize error counter and array for error messages
errors=0
declare -a error_messages

# Function to run all checks on a file
run_checks() {
    local file="$1"
    local relative_file="${file#$ROOT_DIR/}"
    local file_errors=0
    echo "Checking $relative_file..."

    # List of check functions - we'll add more here
    checks=(
        "check_filename"
        "check_token"
        # Add more check functions here as we create them
    )

    # Run each check
    for check in "${checks[@]}"; do
        if ! $check "$file" "$relative_file"; then
            ((file_errors++))
        fi
    done

    if [ $file_errors -gt 0 ]; then
        return 1
    fi
    return 0
}

# Example check function - validates filename format
check_filename() {
    local file="$1"
    local relative_file="$2"
    local basename=$(basename "$file")

    # For now just return true
    # We'll add actual checks later
    return 0
}

# Check that api*.pipe files have the required token declaration
check_token() {
    local file="$1"
    local relative_file="$2"
    local basename=$(basename "$file")

    # Only check .pipe files that start with api
    if [[ "$basename" == api*.pipe ]]; then
        if ! grep -q 'TOKEN "stats_page" READ' "$file"; then
            error_messages+=("→ $relative_file is missing required 'TOKEN \"stats_page\" READ' declaration")
            ((errors++))
            return 1
        fi
    fi

    return 0
}

# Main execution
echo "Running linting checks..."

# Process all files using find
while IFS= read -r file; do
    if [ -f "$file" ]; then
        # Run checks but don't let failures stop the loop
        run_checks "$file" || true
    fi
done < <(find "$ROOT_DIR/datasources" "$ROOT_DIR/pipes" -type f \( -name "*.datasource" -o -name "*.pipe" \))

# Final output
echo
if [ $errors -eq 0 ]; then
    echo -e "${GREEN}All checks passed!${NC}"
else
    echo -e "${RED}Found $errors error(s):${NC}"
    echo "----------------------------------------"
    for msg in "${error_messages[@]}"; do
        echo -e "${RED}$msg${NC}"
    done
    echo "----------------------------------------"
fi
echo

# Exit with error if any checks failed
exit $((errors > 0))
