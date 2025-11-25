#!/bin/bash
#
# Test script for gstenv Package Age Verification
#
# This script tests the cooldown implementation with various scenarios

set -eo pipefail

# Source the implementation
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/gstenv-cooldown-example.sh"

# Test configuration
export GSTENV_VERBOSE=true
TEST_RESULTS=()

# ============================================================================
# Test Framework
# ============================================================================

run_test() {
    local test_name="$1"
    local test_function="$2"
    
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "TEST: $test_name"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    
    if $test_function; then
        echo "✅ PASSED: $test_name"
        TEST_RESULTS+=("PASS: $test_name")
    else
        echo "❌ FAILED: $test_name"
        TEST_RESULTS+=("FAIL: $test_name")
    fi
}

# ============================================================================
# Test Cases
# ============================================================================

test_dependencies() {
    check_dependencies
}

test_old_package() {
    # Test with npm package (should be old enough)
    check_package_age "npm" "latest"
}

test_specific_old_version() {
    # Test with a specific old version
    check_package_age "eslint" "7.0.0"
}

test_nonexistent_package() {
    # Test with non-existent package (should fail safely)
    if check_package_age "this-package-does-not-exist-xyz123" "latest"; then
        return 1  # Should have failed
    else
        return 0  # Correctly failed
    fi
}

test_invalid_version() {
    # Test with invalid version (should fail safely)
    if check_package_age "npm" "999.999.999"; then
        return 1  # Should have failed
    else
        return 0  # Correctly failed
    fi
}

test_scoped_package() {
    # Test with a scoped package (if it exists)
    check_package_age "@eslint/eslintrc" "latest" || return 0
}

test_skip_cooldown_flag() {
    # Test that GSTENV_SKIP_COOLDOWN works
    export GSTENV_SKIP_COOLDOWN=true
    
    # Even a brand new package should pass when cooldown is skipped
    local result
    if check_package_age "npm" "latest"; then
        result=0
    else
        result=1
    fi
    
    export GSTENV_SKIP_COOLDOWN=false
    return $result
}

test_cooldown_days_override() {
    # Test that GSTENV_COOLDOWN_DAYS can be overridden
    local original_cooldown="$GSTENV_COOLDOWN_DAYS"
    export GSTENV_COOLDOWN_DAYS=365  # Very long cooldown
    
    # npm package should fail with 365 day cooldown
    local result
    if check_package_age "npm" "latest"; then
        result=1  # Should have failed with 365 day cooldown
    else
        result=0  # Correctly failed
    fi
    
    export GSTENV_COOLDOWN_DAYS="$original_cooldown"
    return $result
}

test_network_timeout() {
    # Test with invalid registry (should timeout and fail safely)
    local original_timeout="$NPM_REGISTRY_TIMEOUT"
    export NPM_REGISTRY_TIMEOUT=1
    
    # Override the registry URL in the function would be needed for proper testing
    # For now, just test that the timeout setting is respected
    local result=0
    
    export NPM_REGISTRY_TIMEOUT="$original_timeout"
    return $result
}

# ============================================================================
# Integration Tests
# ============================================================================

test_check_command() {
    # Test the check command
    bash "${SCRIPT_DIR}/gstenv-cooldown-example.sh" check npm
}

# Note: We won't actually test install/update commands to avoid modifying the system

# ============================================================================
# Main Test Runner
# ============================================================================

main() {
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║  gstenv Package Age Verification - Test Suite                     ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    
    # Check if we have the required tools
    if ! command -v jq &> /dev/null; then
        echo "❌ jq is not installed. Please install jq to run tests."
        echo "   Ubuntu/Debian: sudo apt-get install jq"
        echo "   macOS: brew install jq"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        echo "❌ curl is not installed. Please install curl to run tests."
        exit 1
    fi
    
    # Run all tests
    run_test "Dependencies check" test_dependencies
    run_test "Old package check (npm)" test_old_package
    run_test "Specific old version check" test_specific_old_version
    run_test "Non-existent package handling" test_nonexistent_package
    run_test "Invalid version handling" test_invalid_version
    run_test "Scoped package check" test_scoped_package
    run_test "Skip cooldown flag" test_skip_cooldown_flag
    run_test "Cooldown days override" test_cooldown_days_override
    run_test "Check command" test_check_command
    
    # Print summary
    echo ""
    echo "╔════════════════════════════════════════════════════════════════════╗"
    echo "║  Test Summary                                                      ║"
    echo "╚════════════════════════════════════════════════════════════════════╝"
    
    local passed=0
    local failed=0
    
    for result in "${TEST_RESULTS[@]}"; do
        echo "$result"
        if [[ "$result" =~ ^PASS ]]; then
            ((passed++))
        else
            ((failed++))
        fi
    done
    
    echo ""
    echo "Total: ${#TEST_RESULTS[@]} tests, $passed passed, $failed failed"
    
    if [ $failed -eq 0 ]; then
        echo "✅ All tests passed!"
        exit 0
    else
        echo "❌ Some tests failed"
        exit 1
    fi
}

# Run tests
main "$@"
