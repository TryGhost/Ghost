#!/usr/bin/env bash
set -euo pipefail

# Configuration
HASH_FILE=".docker-nix/default.nix"
FAKE_HASH="sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA="

# Portable sed -i helper (GNU vs BSD/macOS)
sed_inplace() {
  if sed --version >/dev/null 2>&1; then
    # GNU sed
    sed -i "$@"
  else
    # BSD/macOS sed
    sed -i '' "$@"
  fi
}

# Parse arguments
SYSTEM="${1:-aarch64-linux}"

usage() {
  echo "Usage: nix run .#update-yarn-hash [system]"
  echo ""
  echo "Updates the fetchYarnDeps hash in $HASH_FILE after yarn.lock changes."
  echo ""
  echo "Arguments:"
  echo "  system  - Nix system to build for (default: aarch64-linux)"
  echo "            Use aarch64-linux or x86_64-linux"
  echo ""
  echo "Note: On macOS, you need a Linux builder configured (e.g., linux-builder,"
  echo "      or a remote builder) since yarn-offline-cache is a Linux derivation."
  echo ""
  echo "Examples:"
  echo "  nix run .#update-yarn-hash"
  echo "  nix run .#update-yarn-hash x86_64-linux"
  exit 1
}

if [[ "${1:-}" == "-h" ]] || [[ "${1:-}" == "--help" ]]; then
  usage
fi

# Ensure we're in the repo root
if [[ ! -f "$HASH_FILE" ]]; then
  echo "Error: $HASH_FILE not found"
  echo "Make sure you're running from the repository root"
  exit 1
fi

echo ""
echo "🔄 Updating yarn offline cache hash"
echo "   Hash file: $HASH_FILE"
echo "   System: $SYSTEM"
echo ""

# Step 1: Extract current hash from the fetchYarnDeps block
# Look for: hash = "sha256-...";
CURRENT_HASH=$(grep 'fetchYarnDeps' -A5 "$HASH_FILE" | grep 'hash = "' | sed 's/.*hash = "\([^"]*\)".*/\1/' | head -1)

if [[ -z "$CURRENT_HASH" ]]; then
  echo "Error: Could not find fetchYarnDeps hash in $HASH_FILE"
  exit 1
fi

echo "Current hash: $CURRENT_HASH"

if [[ "$CURRENT_HASH" == "$FAKE_HASH" ]]; then
  echo "Hash is already set to fake hash, proceeding to build..."
else
  echo "Replacing with fake hash..."
  sed_inplace "s|hash = \"$CURRENT_HASH\"|hash = \"$FAKE_HASH\"|" "$HASH_FILE"
fi

# Step 2: Build and capture the correct hash from error output
echo ""
echo "Building to discover correct hash (this will fail with hash mismatch)..."
echo "This might take a few minutes. Your CPU usage should increase."
echo ""

TMPFILE=$(mktemp)
trap 'rm -f "$TMPFILE"' EXIT
nix build ".#packages.${SYSTEM}.yarn-offline-cache" --log-format bar 2>&1 | tee "$TMPFILE" || true
BUILD_OUTPUT=$(cat "$TMPFILE")

# Step 3: Extract the correct hash from "got:" line
# Nix outputs: "    got:    sha256-XXXXX..."
CORRECT_HASH=$(echo "$BUILD_OUTPUT" | grep 'got:' | awk '{print $2}' | head -1)

if [[ -z "$CORRECT_HASH" ]]; then
  echo "Error: Could not extract hash from build output"
  echo ""
  echo "Build output:"
  echo "$BUILD_OUTPUT"
  echo ""
  echo "Restoring original hash..."
  sed_inplace "s|hash = \"$FAKE_HASH\"|hash = \"$CURRENT_HASH\"|" "$HASH_FILE"
  exit 1
fi

echo "Discovered hash: $CORRECT_HASH"

# Step 4: Replace fake hash with correct hash
echo ""
echo "Updating $HASH_FILE with correct hash..."
sed_inplace "s|hash = \"$FAKE_HASH\"|hash = \"$CORRECT_HASH\"|" "$HASH_FILE"

# Step 5: Verify the build succeeds
echo ""
echo "Verifying build with new hash..."
if nix build ".#packages.${SYSTEM}.yarn-offline-cache" --no-link --log-format bar; then
  echo ""
  echo "✅ Successfully updated yarn offline cache hash!"
  echo "   New hash: $CORRECT_HASH"
  echo ""
  echo "Don't forget to commit the changes to $HASH_FILE"
else
  echo ""
  echo "❌ Verification build failed"
  echo "   The hash was updated but the build still fails."
  echo "   Check $HASH_FILE manually."
  exit 1
fi
