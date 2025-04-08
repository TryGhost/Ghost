#!/usr/bin/env bash
set -euo pipefail

# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Record start time
start_time=$(date +%s)

# Set locale environment variables to avoid Perl warnings
export LC_ALL=C.UTF-8
export LANG=C.UTF-8

# Check if GNU Parallel is available
if ! command -v parallel >/dev/null 2>&1; then
    echo "GNU Parallel is required but not installed. Please install it first."
    echo "On Ubuntu/Debian: sudo apt-get install parallel"
    echo "On macOS: brew install parallel"
    exit 1
fi

# Parse command line options
jobs=""
test_name=""
while [[ $# -gt 0 ]]; do
    case $1 in
        -j|--jobs)
            if [[ -z "${2:-}" || "$2" == -* ]]; then
                echo "Error: -j|--jobs requires a number argument"
                exit 1
            fi
            jobs="$2"
            shift 2
            ;;
        -n|--name)
            if [[ -z "${2:-}" || "$2" == -* ]]; then
                echo "Error: -n|--name requires a <test_name> argument"
                exit 1
            fi
            test_name="$2"
            shift 2
            ;;
        *)
            # Store the test name if provided
            # test_name="$1"
            # shift
            echo "Error: Unknown option: $1"
            exit 1
            ;;
    esac
done
# Set and export the TB_VERSION variable from .tinyenv file
source "$SCRIPT_DIR/../.tinyenv"
export TB_VERSION
echo "Using TB_VERSION: $TB_VERSION"
export TB_VERSION_WARNING=0

# Get the expected count once, outside of any function
ndjson_file="./tests/fixtures/analytics_events.ndjson"
export expected_count=$(grep -c '^' "$ndjson_file" || echo "0")

# Get number of CPU cores if not overridden
if [[ -z "$jobs" ]]; then
    if [[ "$(uname)" == "Darwin" ]]; then
        jobs=$(( $(sysctl -n hw.ncpu) * 2 ))
    else
        jobs=$(( $(nproc) * 2 ))
    fi
fi

echo "Using $jobs parallel jobs for test execution"

check_sum() {
    local file=$1
    local expected_count=$2

    # Only perform the check if the file starts with "all_"
    if [[ ! $(basename "$file") =~ ^all_ ]]; then
        return 0
    fi

    local sum=0
    local column_name=""

    # Determine if the file has a 'pageviews' column
    if head -n1 "$file" | grep -q 'pageviews'; then
        column_name="pageviews"
    else
        echo "No 'pageviews' column found in $file"
        return 0  # No relevant column found, skip the check
    fi

    # Get the column number
    local column_num=$(head -n1 "$file" | tr ',' '\n' | grep -n "$column_name" | cut -d: -f1)

    # Sum the values in the column
    sum=$(tail -n +2 "$file" | cut -d',' -f"$column_num" | awk '{s+=$1} END {print s}')

    # Check if the sum equals the number of lines in the NDJSON file
    if [ "$sum" -eq "$expected_count" ]; then
        echo "✅ Sanity check passed: Sum of $column_name is $sum (matches NDJSON line count)"
        return 0
    else
        echo "🚨 WARNING: Sanity check failed: Sum of $column_name is $sum, expected $expected_count (NDJSON line count)"
        return 1  # Return 1 to indicate a warning, but not a failure
    fi
}

run_test() {
    t=$1
    echo "** Running $t **"
    echo "** $(cat $t)"
    tmpfile=$(mktemp)
    retries=0
    TOTAL_RETRIES=3

    # When appending fixtures, we need to retry in case of the data is not replicated in time
    while [ $retries -lt $TOTAL_RETRIES ]; do
        # Run the test and store the output in a temporary file
        bash "$t" >"$tmpfile"
        exit_code=$?
        if [ "$exit_code" -eq 0 ]; then
            # If the test passed, break the loop
            if diff -B "${t}.result" "$tmpfile" >/dev/null 2>&1; then
                break
            # If the test failed, increment the retries counter and try again
            else
                retries=$((retries + 1))
            fi
        # If the bash command failed, print an error message and break the loop
        else
            break
        fi
    done

    if diff -B "${t}.result" "$tmpfile" >/dev/null 2>&1; then
        echo "✅ Test $t passed"
        check_sum "${t}.result" "$expected_count" || echo "🚨 Warning: Sanity check did not pass."
        rm "$tmpfile"
        return 0
    elif [ $retries -eq $TOTAL_RETRIES ]; then
        echo "🚨 ERROR: Test $t failed, showing differences:"
        diff -B -u --color -U3 "${t}.result" "$tmpfile"  # Use unified diff format with 3 lines of context
        rm "$tmpfile"
        return 1
    else
        echo "🚨 ERROR: Test $t failed with bash command exit code $?"
        cat "$tmpfile"
        rm "$tmpfile"
        return 1
    fi
    echo ""
}

export -f run_test
export -f check_sum

fail=0

# Check if a test name was provided as an argument
if [[ -n "${test_name:-}" ]]; then
    # Find the test file that matches the provided name
    test_file=$(find ./tests -name "${test_name}*.test")
    if [ -n "$test_file" ]; then
        run_test "$test_file" || fail=1
    else
        echo "🚨 ERROR: No test found matching name: $test_name"
        fail=1
    fi
else
    # If no test name provided, run all tests in parallel
    echo "Running tests in parallel using $jobs workers"
    # Use parallel to run the tests, maintaining output order
    output_file=$(mktemp)
    find ./tests -name "*.test" -print0 | \
        parallel -0 --jobs "$jobs" --keep-order --line-buffer \
        'run_test {} || echo "PARALLEL_TEST_FAILED"' | tee "$output_file"
    if grep -q "PARALLEL_TEST_FAILED" "$output_file"; then
        rm "$output_file"
        fail=1
    else
        rm "$output_file"
    fi
fi

if [ $fail == 1 ]; then
    echo "🚨 ERROR: Some tests failed"
    exit 1
fi

# Calculate and display duration
end_time=$(date +%s)
duration=$((end_time - start_time))
minutes=$((duration / 60))
seconds=$((duration % 60))
echo "✨ Test suite completed in ${minutes}m ${seconds}s"
