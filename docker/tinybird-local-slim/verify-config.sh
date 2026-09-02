#!/usr/bin/env bash
#
# Fails when the slim image's re-declared runtime config has drifted from upstream.
#
# The slim build flattens the rootfs into a `FROM scratch` stage, which discards
# the upstream image config, so the Dockerfile restates it by hand. An upstream
# release that adds an env var or changes the command would silently ship a
# broken image without this check.
#
# Usage: verify-config.sh <upstream-ref> <slim-ref>
set -euo pipefail

UPSTREAM="${1:?upstream image ref required}"
SLIM="${2:?slim image ref required}"

config() {
    local out
    out=$(docker image inspect --platform linux/amd64 "$1" --format '{{json .Config}}' | jq -S '{
        Env: (.Env // []| sort),
        Cmd, Entrypoint, WorkingDir, User, StopSignal,
        ExposedPorts: (.ExposedPorts // {} | keys),
        Volumes: (.Volumes // {} | keys),
        Labels: (.Labels // {}),
        Healthcheck: (.Healthcheck // null)
    }')
    # An index manifest with no local amd64 child inspects to an empty config —
    # that is a missing `docker pull --platform linux/amd64`, not real drift.
    if [[ "$(jq -r '.Env | length' <<<"$out")" == "0" ]]; then
        echo "No linux/amd64 config for $1 — pull it for that platform first." >&2
        return 1
    fi
    printf '%s\n' "$out"
}

upstream_config=$(config "$UPSTREAM")
slim_config=$(config "$SLIM")

if diff -u <(printf '%s\n' "$upstream_config") <(printf '%s\n' "$slim_config"); then
    echo "Slim image config matches upstream."
    exit 0
fi

cat >&2 <<EOF

Slim image runtime config differs from upstream (- upstream, + slim).
Reconcile docker/tinybird-local-slim/Dockerfile with the pinned upstream image.
EOF
exit 1
