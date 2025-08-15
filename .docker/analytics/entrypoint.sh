#!/bin/sh
set -eu

echo "Analytics entrypoint.sh"

source /app/.env
export TINYBIRD_TRACKER_TOKEN="$TINYBIRD_TRACKER_TOKEN"

exec "$@"
