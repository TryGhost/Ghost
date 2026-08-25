#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

E2E_COMPOSE_PROJECT="${COMPOSE_PROJECT_NAME:-ghost-e2e}"
compose_files=(-f compose.dev.yaml -f e2e/compose.e2e.tmpfs.yaml -f compose.dev.analytics.yaml)

docker compose --project-name "$E2E_COMPOSE_PROJECT" "${compose_files[@]}" down --volumes --remove-orphans
