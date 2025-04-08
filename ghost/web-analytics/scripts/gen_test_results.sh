#!/usr/bin/env bash
set -euo pipefail

# Directory containing the test files
TEST_DIR="./tests"

# Get the directory where the script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Set the TB_VERSION variable from .tinyenv file
source "$SCRIPT_DIR/../.tinyenv"
export TB_VERSION
echo "Using TB_VERSION: $TB_VERSION"
export TB_VERSION_WARNING=0

# Parse command line options
jobs=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -j|--jobs)
            if [[ -n "${2:-}" ]]; then
                jobs="$2"
                shift 2
            else
                echo "Error: -j|--jobs requires a number argument"
                exit 1
            fi
            ;;
        *)
            shift
            ;;
    esac
done

# Check if GNU Parallel is available
if ! command -v parallel >/dev/null 2>&1; then
    echo "GNU Parallel is required but not installed. Please install it first."
    echo "On Ubuntu/Debian: sudo apt-get install parallel"
    echo "On macOS: brew install parallel"
    exit 1
fi

# Get number of CPU cores if not overridden
if [[ -z "$jobs" ]]; then
    if [[ "$(uname)" == "Darwin" ]]; then
        jobs=$(( $(sysctl -n hw.ncpu) * 2 ))
    else
        jobs=$(( $(nproc) * 2 ))
    fi
fi

echo "Using $jobs parallel jobs for test result generation"

# Function to execute a test and update its result file
execute_and_update() {
    local test_file="$1"
    local result_file="${test_file%.test}.test.result"

    echo "Executing test: $test_file"

    # Execute the test command and capture the output
    output=$(bash "$test_file")

    # Write the output to the result file, overwriting existing content
    echo "$output" > "$result_file"

    echo "Updated result file: $result_file"
    echo "------------------------"
}

export -f execute_and_update

# Main execution
echo "Starting test result regeneration..."

# Use parallel to process all test files
find "$TEST_DIR" -name "*.test" -type f -print0 | \
    parallel -0 --jobs "$jobs" --keep-order --line-buffer \
    'execute_and_update {}'

echo "Test result regeneration complete."
