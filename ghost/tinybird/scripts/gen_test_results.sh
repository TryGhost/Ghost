#!/usr/bin/env bash
set -euo pipefail

# Directory containing the test files
TEST_DIR="./tests"

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

# Main execution
echo "Starting test result regeneration..."

# Find all .test files and process them
find "$TEST_DIR" -name "*.test" -type f | while read -r test_file; do
    execute_and_update "$test_file"
done

echo "Test result regeneration complete."
