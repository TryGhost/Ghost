#!/bin/bash
#
# gstenv Package Age Verification Implementation
# 
# This script provides functions to check npm package age before installation
# to mitigate supply-chain attack risks (ref: Shai-Hulud npm compromise)
#
# Add this to the existing gstenv.sh script in the Toolbox repository

set -eo pipefail

# ============================================================================
# Configuration
# ============================================================================

# Cooldown period in days (can be overridden via environment variable)
GSTENV_COOLDOWN_DAYS="${GSTENV_COOLDOWN_DAYS:-3}"

# Option to skip cooldown check (for emergency situations)
GSTENV_SKIP_COOLDOWN="${GSTENV_SKIP_COOLDOWN:-false}"

# Enable verbose logging
GSTENV_VERBOSE="${GSTENV_VERBOSE:-false}"

# Timeout for npm registry requests (seconds)
NPM_REGISTRY_TIMEOUT="${NPM_REGISTRY_TIMEOUT:-10}"

# ============================================================================
# Utility Functions
# ============================================================================

# Log verbose messages
log_verbose() {
    if [ "$GSTENV_VERBOSE" = "true" ]; then
        echo "[DEBUG] $*" >&2
    fi
}

# Log info messages
log_info() {
    echo "ℹ️  $*" >&2
}

# Log warning messages
log_warning() {
    echo "⚠️  $*" >&2
}

# Log error messages
log_error() {
    echo "❌ $*" >&2
}

# Log success messages
log_success() {
    echo "✅ $*" >&2
}

# ============================================================================
# Dependency Checks
# ============================================================================

check_dependencies() {
    local missing_deps=()
    
    for cmd in curl jq date; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done
    
    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Required dependencies missing: ${missing_deps[*]}"
        log_error "Please install the missing dependencies and try again."
        return 1
    fi
    
    log_verbose "All required dependencies are available"
    return 0
}

# ============================================================================
# Package Age Verification
# ============================================================================

# Check if an npm package version was published more than N days ago
# 
# Args:
#   $1 - Package name (e.g., "eslint" or "@ghost/admin")
#   $2 - Version to check (optional, defaults to "latest")
#
# Returns:
#   0 if package is safe to install (older than cooldown period)
#   1 if package is too new or check failed
#
check_package_age() {
    local package_name="$1"
    local version="${2:-latest}"
    
    # Skip check if cooldown is disabled
    if [ "$GSTENV_SKIP_COOLDOWN" = "true" ]; then
        log_warning "Package age verification is DISABLED (GSTENV_SKIP_COOLDOWN=true)"
        return 0
    fi
    
    log_verbose "Checking age of ${package_name}@${version}"
    
    # Handle scoped packages (URL-encode the @)
    local encoded_package_name="${package_name//@/%40}"
    local registry_url="https://registry.npmjs.org/${encoded_package_name}"
    
    # Fetch package metadata from npm registry
    log_verbose "Fetching metadata from ${registry_url}"
    local metadata=$(curl -sS --max-time "$NPM_REGISTRY_TIMEOUT" "$registry_url" 2>&1)
    local curl_exit_code=$?
    
    if [ $curl_exit_code -ne 0 ]; then
        log_error "Failed to fetch metadata for ${package_name} (curl exit code: ${curl_exit_code})"
        log_error "This package will be skipped for safety"
        return 1
    fi
    
    if [ -z "$metadata" ]; then
        log_error "Empty response from npm registry for ${package_name}"
        return 1
    fi
    
    # Check if response is valid JSON
    if ! echo "$metadata" | jq -e . >/dev/null 2>&1; then
        log_error "Invalid JSON response from npm registry for ${package_name}"
        log_verbose "Response: ${metadata:0:200}..."
        return 1
    fi
    
    # Resolve "latest" to actual version number
    if [ "$version" = "latest" ]; then
        version=$(echo "$metadata" | jq -r '.["dist-tags"].latest')
        if [ -z "$version" ] || [ "$version" = "null" ]; then
            log_error "Could not determine latest version for ${package_name}"
            return 1
        fi
        log_verbose "Latest version is ${version}"
    fi
    
    # Extract publish time for the specific version
    local publish_time=$(echo "$metadata" | jq -r ".time[\"$version\"]")
    
    if [ -z "$publish_time" ] || [ "$publish_time" = "null" ]; then
        log_error "Could not determine publish date for ${package_name}@${version}"
        return 1
    fi
    
    log_verbose "Package ${package_name}@${version} was published at ${publish_time}"
    
    # Convert publish time to Unix timestamp
    # Try GNU date format first, then BSD date format
    local publish_timestamp
    if publish_timestamp=$(date -d "$publish_time" +%s 2>/dev/null); then
        log_verbose "Using GNU date format"
    elif publish_timestamp=$(date -j -f "%Y-%m-%dT%H:%M:%S" "${publish_time%.*}" +%s 2>/dev/null); then
        log_verbose "Using BSD date format"
    else
        log_error "Could not parse date: ${publish_time}"
        return 1
    fi
    
    local current_timestamp=$(date +%s)
    local age_in_seconds=$((current_timestamp - publish_timestamp))
    local age_in_days=$((age_in_seconds / 86400))
    
    log_verbose "Package age: ${age_in_days} days (cooldown period: ${GSTENV_COOLDOWN_DAYS} days)"
    
    # Check if package is older than cooldown period
    if [ $age_in_days -lt $GSTENV_COOLDOWN_DAYS ]; then
        log_warning "Skipping ${package_name}@${version}: published ${age_in_days} day(s) ago"
        log_info "Package will be available for installation after $(date -d "+$((GSTENV_COOLDOWN_DAYS - age_in_days)) days" +"%Y-%m-%d" 2>/dev/null || echo "$((GSTENV_COOLDOWN_DAYS - age_in_days)) more day(s)")"
        return 1
    fi
    
    log_success "${package_name}@${version} is ${age_in_days} day(s) old - safe to install"
    return 0
}

# ============================================================================
# Package Installation Functions
# ============================================================================

# Install a global npm package with age verification
#
# Args:
#   $1 - Package name (e.g., "eslint" or "eslint@8.0.0")
#
# Returns:
#   0 if package was installed successfully
#   1 if package was skipped or installation failed
#
safe_install_global_package() {
    local package_spec="$1"
    
    # Split package name and version if specified
    local package_name="${package_spec%%@*}"
    local package_version="latest"
    
    if [[ "$package_spec" =~ @ ]]; then
        package_version="${package_spec##*@}"
    fi
    
    log_info "Checking ${package_name}@${package_version}..."
    
    if check_package_age "$package_name" "$package_version"; then
        log_info "Installing ${package_spec}..."
        if npm install -g "$package_spec"; then
            log_success "Successfully installed ${package_spec}"
            return 0
        else
            log_error "Failed to install ${package_spec}"
            return 1
        fi
    else
        log_warning "Installation of ${package_spec} was skipped due to cooldown period"
        return 1
    fi
}

# Update all outdated global npm packages with age verification
#
# Returns:
#   0 if all updates completed (even if some were skipped)
#
safe_update_global_packages() {
    log_info "Checking for outdated global packages..."
    
    # Get list of outdated packages
    local outdated_output=$(npm outdated -g --parseable 2>/dev/null || true)
    
    if [ -z "$outdated_output" ]; then
        log_success "All global packages are up to date!"
        return 0
    fi
    
    # Parse outdated packages
    # Format: /path:package:current:wanted:latest:location
    local updated_count=0
    local skipped_count=0
    local failed_count=0
    
    while IFS= read -r line; do
        if [ -z "$line" ]; then
            continue
        fi
        
        local package_name=$(echo "$line" | cut -d: -f2)
        local current_version=$(echo "$line" | cut -d: -f3)
        local latest_version=$(echo "$line" | cut -d: -f5)
        
        log_info "Package ${package_name}: ${current_version} → ${latest_version}"
        
        if check_package_age "$package_name" "$latest_version"; then
            log_info "Updating ${package_name}..."
            if npm update -g "$package_name"; then
                log_success "Updated ${package_name} to ${latest_version}"
                ((updated_count++))
            else
                log_error "Failed to update ${package_name}"
                ((failed_count++))
            fi
        else
            log_warning "Update of ${package_name} delayed due to cooldown period"
            ((skipped_count++))
        fi
    done <<< "$outdated_output"
    
    log_info "Update summary: ${updated_count} updated, ${skipped_count} skipped, ${failed_count} failed"
    return 0
}

# ============================================================================
# Main Function (for testing)
# ============================================================================

main() {
    echo "gstenv Package Age Verification - Example Implementation"
    echo "========================================================="
    echo ""
    
    # Check dependencies
    if ! check_dependencies; then
        exit 1
    fi
    
    echo "Configuration:"
    echo "  Cooldown period: ${GSTENV_COOLDOWN_DAYS} days"
    echo "  Skip cooldown: ${GSTENV_SKIP_COOLDOWN}"
    echo "  Verbose logging: ${GSTENV_VERBOSE}"
    echo ""
    
    # Example usage
    if [ $# -eq 0 ]; then
        echo "Usage:"
        echo "  $0 install <package>     - Install a package with age verification"
        echo "  $0 update                - Update all global packages with age verification"
        echo "  $0 check <package>       - Check package age without installing"
        echo ""
        echo "Examples:"
        echo "  $0 install eslint"
        echo "  $0 install eslint@8.0.0"
        echo "  $0 update"
        echo "  $0 check npm"
        echo ""
        echo "Environment variables:"
        echo "  GSTENV_COOLDOWN_DAYS     - Cooldown period in days (default: 3)"
        echo "  GSTENV_SKIP_COOLDOWN     - Set to 'true' to disable cooldown (default: false)"
        echo "  GSTENV_VERBOSE           - Set to 'true' for verbose logging (default: false)"
        echo "  NPM_REGISTRY_TIMEOUT     - Timeout for npm registry requests in seconds (default: 10)"
        exit 0
    fi
    
    local command="$1"
    shift
    
    case "$command" in
        install)
            if [ $# -eq 0 ]; then
                log_error "Package name required"
                exit 1
            fi
            safe_install_global_package "$1"
            ;;
        update)
            safe_update_global_packages
            ;;
        check)
            if [ $# -eq 0 ]; then
                log_error "Package name required"
                exit 1
            fi
            check_package_age "$1"
            ;;
        *)
            log_error "Unknown command: $command"
            exit 1
            ;;
    esac
}

# Run main function if script is executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main "$@"
fi
