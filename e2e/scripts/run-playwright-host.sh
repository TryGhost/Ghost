#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

if [[ "${CI:-}" != "true" ]]; then
  node "$REPO_ROOT/e2e/scripts/sync-tinybird-state.mjs"
fi

cd "$REPO_ROOT/e2e"
exec "$@"
