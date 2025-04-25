#!/usr/bin/env bash

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

# Set the TB_VERSION variable from .tinyenv file
source "$SCRIPT_DIR/../.tinyenv"
export TB_VERSION
echo "Using TB_VERSION: $TB_VERSION"

# Initialize error counter and array for error messages
errors=0
declare -a error_messages

# Store the reference version (first one encountered)
reference_version=""

# Function to run all checks on a file
run_checks() {
    local file="$1"
    local relative_file="${file#$ROOT_DIR/}"
    local file_errors=0
    echo "Checking $relative_file..."

    # List of check functions - we'll add more here
    checks=(
        "check_token"
        "check_version"
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

# Check that all datasource and pipe files (except analytics_events.datasource) have a VERSION parameter
check_version() {
    local file="$1"
    local relative_file="$2"
    local basename=$(basename "$file")

    # Skip analytics_events.datasource
    if [[ "$basename" == "analytics_events.datasource" ]]; then
        return 0
    fi

    # Only check .datasource and .pipe files
    if [[ "$file" == *.datasource || "$file" == *.pipe ]]; then
        if ! grep -q '^VERSION [0-9]\+' "$file"; then
            error_messages+=("→ $relative_file is missing required 'VERSION' parameter")
            ((errors++))
            return 1
        fi

        # Extract the version number and compare with TB_VERSION
        local file_version=$(grep -E '^VERSION [0-9]+' "$file" | awk '{print $2}')
        if [[ "$file_version" != "$TB_VERSION" ]]; then
            error_messages+=("→ $relative_file has VERSION $file_version but should be $TB_VERSION")
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
