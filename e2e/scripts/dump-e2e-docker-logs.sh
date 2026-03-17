#!/usr/bin/env bash
set -euo pipefail

echo "::group::docker ps -a"
docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
echo "::endgroup::"

dump_container_logs() {
    local pattern="$1"
    local label="$2"
    local found=0

    while IFS= read -r container_name; do
        if [[ -z "$container_name" ]]; then
            continue
        fi

        found=1
        echo "::group::${label}: ${container_name}"
        docker inspect "$container_name" --format 'State={{json .State}}' || true
        docker logs --tail=500 "$container_name" || true
        echo "::endgroup::"
    done < <(docker ps -a --format '{{.Names}}' | grep -E "$pattern" || true)

    if [[ "$found" -eq 0 ]]; then
        echo "No containers matched ${label} pattern: ${pattern}"
    fi
}

dump_container_logs '^ghost-e2e-worker-' 'Ghost worker'
dump_container_logs '^ghost-e2e-gateway-' 'E2E gateway'
dump_container_logs '^ghost-dev-(mysql|redis|mailpit|analytics|analytics-db|tinybird-local|tb-cli)$' 'E2E infra'
