#!/usr/bin/env bash
set -euo pipefail

# Parse flags
ALLOW_UNCOMMITTED=false
ARGS=()
while [[ $# -gt 0 ]]; do
  case $1 in
    --allow-uncommitted)
      ALLOW_UNCOMMITTED=true
      shift
      ;;
    *)
      ARGS+=("$1")
      shift
      ;;
  esac
done

set -- "${ARGS[@]+"${ARGS[@]}"}"

if [ $# -lt 2 ]; then
  echo "Usage: nix run .#precache-package [--allow-uncommitted] <flake-url> <flake-output> [nix-build-flags...]"
  echo ""
  echo "Arguments:"
  echo "  flake-url     - Flake URL to build from (supports all Nix flake URL formats)"
  echo "  flake-output  - Full flake output path (e.g., packages.aarch64-linux.dockerImage)"
  echo ""
  echo "Options:"
  echo "  --allow-uncommitted  - Allow path-based URLs that include uncommitted changes"
  echo ""
  echo "Additional Nix flags:"
  echo "  Any extra arguments are passed directly to 'nix build'"
  echo "  Examples: --verbose, --max-jobs 4, --show-trace, --keep-going"
  echo "  Default flags: --print-out-paths --no-link (can be overridden)"
  echo "  ⚠️  Avoid cache-breaking flags like --impure or --option sandbox false"
  echo ""
  echo "This builds from any flake URL and pushes to binary cache,"
  echo "ensuring CI gets 100% cache hits."
  echo ""
  echo "Examples:"
  echo "  # From GitHub (after push)"
  echo "  nix run .#precache-package github:hello-stocha/ghost/abc123 packages.aarch64-linux.dockerImage"
  echo ""
  echo "  # From local repo at specific commit (before push)"
  echo "  nix run .#precache-package \"git+file://\$PWD?rev=\$(git rev-parse HEAD)\" packages.aarch64-linux.dockerImage"
  echo ""
  echo "  # From local repo at HEAD (simplest)"
  echo "  nix run .#precache-package \"git+file://\$PWD\" packages.aarch64-linux.dockerImage"
  echo ""
  echo "Simple workflows:"
  echo "  # Local precache (before push)"
  echo "  git commit -m 'feat: awesome'"
  echo "  nix run .#precache-package \"git+file://\$PWD\" packages.aarch64-linux.dockerImage"
  echo ""
  echo "  # Remote precache (after push)"
  echo "  git push"
  echo "  nix run .#precache-package github:hello-stocha/ghost/\$(git rev-parse HEAD) packages.aarch64-linux.dockerImage"
  exit 1
fi

FLAKE_URL="$1"
OUTPUT="$2"
shift 2  # Remove first two args
NIX_EXTRA_ARGS=("$@")  # Capture remaining args for nix build
CACHE_NAME="${CACHIX_CACHE:-hello-stocha}"

if [ -z "${CACHIX_AUTH_TOKEN:-}" ]; then
  echo "❌ CACHIX_AUTH_TOKEN not set"
  echo "   Export it in your shell or add to .envrc.local"
  exit 1
fi

# Check for path-based URL (includes uncommitted changes)
if [[ "$FLAKE_URL" == "." ]] || [[ "$FLAKE_URL" == "./"* ]] || [[ "$FLAKE_URL" == "path:"* ]]; then
  if [ "$ALLOW_UNCOMMITTED" = false ]; then

    echo "⚠️  This flake URL includes uncommitted changes"
    echo ""
    echo "   Flake URL: $FLAKE_URL"
    echo ""
    echo "   Path-based URLs include uncommitted changes to tracked files."
    echo "   If you modify your working tree before committing, this precached"
    echo "   build won't match what CI produces, wasting the cache entry."
    echo ""
    echo "   For reliable precaching, use committed state:"
    echo "     git+file://\$PWD             (local repo, committed state)"
    echo "     github:owner/repo/rev       (GitHub, committed state)"
    echo ""
    echo "   To proceed anyway (not recommended):"
    echo "     nix run .#precache-package --allow-uncommitted \"$FLAKE_URL\" \"$OUTPUT\""
    echo ""
    exit 1
  else
    echo "⚠️  WARNING: Building from uncommitted changes (--allow-uncommitted)"
    echo "   This precache may be orphaned if you modify tracked files before committing."
    echo ""
  fi
fi

echo ""
echo "🚀 Precaching for CI"
echo "   Flake URL: $FLAKE_URL"
echo "   Output: $OUTPUT"
echo "   Cache: $CACHE_NAME"
echo ""

# Check if already cached in Cachix
echo "Checking if already cached..."
# First get the output path without building
OUT_PATH=$(nix eval --raw "$FLAKE_URL#$OUTPUT.outPath" 2>/dev/null || echo "")

if [ -n "$OUT_PATH" ] && nix path-info --store "https://$CACHE_NAME.cachix.org" \
    "$OUT_PATH" >/dev/null 2>&1; then
  echo "✅ Already cached in $CACHE_NAME, skipping build"
  echo "   Cached path: $OUT_PATH"
  exit 0
fi

echo "Not cached, building and pushing full closure to binary cache..."
# Use cachix watch-exec to automatically push everything built (including intermediates)
BUILD_RESULT=$(cachix watch-exec "$CACHE_NAME" -- nix build \
  "$FLAKE_URL#$OUTPUT" \
  --print-out-paths \
  --no-link \
  ${NIX_EXTRA_ARGS[@]+"${NIX_EXTRA_ARGS[@]}"})

if [ -z "$BUILD_RESULT" ]; then
  echo "❌ Build failed"
  exit 1
fi

echo ""
echo "✅ Successfully precached to $CACHE_NAME!"
echo "   Result: $BUILD_RESULT"
echo ""
