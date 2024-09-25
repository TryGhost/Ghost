#!/usr/bin/env bash
set -euo pipefail

export TB_VERSION_WARNING=0

# Get the expected count once, outside of any function
ndjson_file="./datasources/fixtures/analytics_events.ndjson"
export expected_count=$(wc -l < "$ndjson_file" || echo "0")

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
        echo "🚨 Sanity check failed: Sum of $column_name is $sum, expected $expected_count (NDJSON line count)"
        return 1
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
        bash $t >$tmpfile
        exit_code=$?
        if [ "$exit_code" -eq 0 ]; then
            # If the test passed, break the loop
            if diff -B ${t}.result $tmpfile >/dev/null 2>&1; then
                break
            # If the test failed, increment the retries counter and try again
            else
                retries=$((retries+1))
            fi
        # If the bash command failed, print an error message and break the loop
        else
            break
        fi
    done

    if diff -B ${t}.result $tmpfile >/dev/null 2>&1; then
        echo "✅ Test $t passed"
        check_sum ${t}.result $expected_count || return 1
        rm $tmpfile
        return 0
    elif [ $retries -eq $TOTAL_RETRIES ]; then
        echo "🚨 ERROR: Test $t failed, diff:";
        diff -B ${t}.result $tmpfile
        rm $tmpfile
        return 1
    else
        echo "🚨 ERROR: Test $t failed with bash command exit code $?"
        cat $tmpfile
        rm $tmpfile
        return 1
    fi
    echo ""
}
export -f run_test
export -f check_sum

fail=0

# Check if a test name was provided as an argument
if [ $# -eq 1 ]; then
    test_name=$1
    # Find the test file that matches the provided name
    test_file=$(find ./tests -name "${test_name}*.test")
    if [ -n "$test_file" ]; then
        run_test "$test_file" || fail=1
    else
        echo "🚨 ERROR: No test found matching name: $test_name"
        fail=1
    fi
else
    # If no test name provided, run all tests
    find ./tests -name "*.test" -print0 | xargs -0 -I {} bash -c 'run_test "$@"' _ {} || fail=1
fi

if [ $fail == 1 ]; then
  exit 1
fi
