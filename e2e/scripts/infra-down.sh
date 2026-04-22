#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

docker compose -f compose.dev.yaml -f compose.dev.analytics.yaml stop \
  analytics tb-cli tinybird-local mailpit redis mysql
