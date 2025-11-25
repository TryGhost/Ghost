# gstenv 3-Day Cooldown Implementation Plan

## Issue: ONC-1285
Add a 3-day cooldown period before updating global npm dependencies in the `gstenv` tool to reduce exposure to supply-chain attacks (following the Shai-Hulud npm compromise incident).

## Target File
`gstenv.sh` in https://github.com/TryGhost/Toolbox/blob/main/scripts/gstenv.sh

## Objective
Prevent `gstenv` from installing or updating npm packages that were published less than 3 days ago.

## Implementation Approach

### 1. Core Strategy
Before installing or updating any global npm package, check its publish date and only proceed if it's older than 3 days.

### 2. Technical Implementation

#### Option A: Check Package Age Before Installation (Recommended)
Add a function that:
1. Queries the npm registry API for package metadata
2. Extracts the publish date of the latest version
3. Compares with current date
4. Returns whether the package is safe to install

#### Option B: Install to Temporary Location First
1. Install package to a temporary directory
2. Check the package.json modification time
3. Only copy to global location if it passes the age check

**Recommendation:** Option A is cleaner and doesn't require disk I/O for rejected packages.

### 3. Implementation Details

#### Function to Check Package Age
```bash
# Check if an npm package version was published more than 3 days ago
# Returns 0 if safe to install, 1 otherwise
check_package_age() {
    local package_name="$1"
    local cooldown_days=3
    
    # Fetch package metadata from npm registry
    local registry_url="https://registry.npmjs.org/${package_name}"
    local metadata=$(curl -s "$registry_url")
    
    if [ $? -ne 0 ] || [ -z "$metadata" ]; then
        echo "⚠️  Warning: Could not fetch metadata for ${package_name}" >&2
        return 1
    fi
    
    # Extract the latest version's publish time
    local latest_version=$(echo "$metadata" | jq -r '.["dist-tags"].latest')
    local publish_time=$(echo "$metadata" | jq -r ".time[\"$latest_version\"]")
    
    if [ -z "$publish_time" ] || [ "$publish_time" = "null" ]; then
        echo "⚠️  Warning: Could not determine publish date for ${package_name}@${latest_version}" >&2
        return 1
    fi
    
    # Convert publish time to Unix timestamp
    local publish_timestamp=$(date -d "$publish_time" +%s 2>/dev/null || date -j -f "%Y-%m-%dT%H:%M:%S" "${publish_time%.*}" +%s 2>/dev/null)
    local current_timestamp=$(date +%s)
    local age_in_seconds=$((current_timestamp - publish_timestamp))
    local age_in_days=$((age_in_seconds / 86400))
    
    if [ $age_in_days -lt $cooldown_days ]; then
        echo "🛡️  Skipping ${package_name}@${latest_version}: published ${age_in_days} day(s) ago (cooldown: ${cooldown_days} days)" >&2
        return 1
    fi
    
    echo "✅ ${package_name}@${latest_version} is ${age_in_days} day(s) old - safe to install" >&2
    return 0
}
```

#### Modified Installation Logic
```bash
# Example: Wrapping npm install -g commands
install_global_package() {
    local package_name="$1"
    
    if check_package_age "$package_name"; then
        echo "Installing ${package_name}..."
        npm install -g "$package_name"
    else
        echo "Installation of ${package_name} delayed due to cooldown period"
        return 1
    fi
}

# Example: Wrapping npm update -g commands
update_global_packages() {
    # Get list of outdated packages
    local outdated_packages=$(npm outdated -g --parseable | cut -d: -f4)
    
    for package in $outdated_packages; do
        if check_package_age "$package"; then
            echo "Updating ${package}..."
            npm update -g "$package"
        else
            echo "Update of ${package} delayed due to cooldown period"
        fi
    done
}
```

### 4. Required Dependencies
The implementation requires:
- `curl` - to fetch npm registry data
- `jq` - to parse JSON responses from npm registry
- `date` - for timestamp calculations (standard in bash)

Add a dependency check at the start of the script:
```bash
# Check for required dependencies
for cmd in curl jq; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: ${cmd} is required but not installed." >&2
        exit 1
    fi
done
```

### 5. Configuration Options
Consider adding a configuration variable that can be overridden:
```bash
# Default cooldown period in days (can be overridden via environment variable)
GSTENV_COOLDOWN_DAYS="${GSTENV_COOLDOWN_DAYS:-3}"

# Option to disable cooldown (for emergency situations)
GSTENV_SKIP_COOLDOWN="${GSTENV_SKIP_COOLDOWN:-false}"

if [ "$GSTENV_SKIP_COOLDOWN" = "true" ]; then
    echo "⚠️  WARNING: Package age verification is DISABLED" >&2
fi
```

### 6. Error Handling
Handle various failure scenarios:
- npm registry unavailable → Skip installation with warning
- Package metadata not found → Skip installation with warning
- Invalid date format → Skip installation with warning
- Network timeout → Skip installation with warning

Add timeout to curl requests:
```bash
local metadata=$(curl -s --max-time 10 "$registry_url")
```

### 7. Logging
Add optional verbose logging:
```bash
GSTENV_VERBOSE="${GSTENV_VERBOSE:-false}"

log_verbose() {
    if [ "$GSTENV_VERBOSE" = "true" ]; then
        echo "[DEBUG] $*" >&2
    fi
}
```

### 8. Testing Considerations

#### Test Cases:
1. **Package older than 3 days** → Should install
2. **Package published today** → Should skip
3. **Package published exactly 3 days ago** → Should skip (use < not ≤)
4. **Package published 4 days ago** → Should install
5. **npm registry unavailable** → Should skip with warning
6. **Package doesn't exist** → Should skip with warning
7. **Malformed JSON response** → Should skip with warning

#### Manual Testing:
```bash
# Test with a known old package
check_package_age "npm"

# Test with a recently published package (if available)
check_package_age "some-new-package"

# Test with invalid package name
check_package_age "this-package-does-not-exist-xyz123"
```

### 9. Documentation Updates
Update the gstenv documentation/README to include:
- Explanation of the 3-day cooldown
- How to check when a package will be available
- How to override the cooldown (for emergency situations)
- Rationale (supply-chain attack mitigation)

### 10. Migration Path
For existing gstenv users:
1. First release: Add the check but only warn (don't block)
2. Wait 1-2 weeks for feedback
3. Second release: Enable blocking by default

## Security Considerations

### Benefits:
- Reduces risk of immediately pulling in compromised packages
- Provides time for community to identify and report issues
- Aligns with industry best practices for supply-chain security

### Limitations:
- Doesn't protect against packages compromised after 3 days
- Could delay security patches in npm packages themselves
- Requires npm registry to be accessible

### Future Enhancements:
1. Check multiple registries/sources for publish date verification
2. Integrate with security advisory databases
3. Allow package-specific cooldown overrides (e.g., shorter for security tools)
4. Cache package age checks to reduce API calls

## Implementation Checklist

- [ ] Add `check_package_age()` function
- [ ] Add dependency checks for `curl` and `jq`
- [ ] Wrap all `npm install -g` calls with age check
- [ ] Wrap all `npm update -g` calls with age check
- [ ] Add configuration variables (`GSTENV_COOLDOWN_DAYS`, `GSTENV_SKIP_COOLDOWN`)
- [ ] Add error handling and timeouts
- [ ] Add verbose logging option
- [ ] Update documentation
- [ ] Add inline comments explaining the security measure
- [ ] Test with various scenarios
- [ ] Consider phased rollout (warn-only mode first)

## Example Complete Implementation

See `gstenv-cooldown-example.sh` for a complete working example that can be integrated into the existing gstenv.sh script.
