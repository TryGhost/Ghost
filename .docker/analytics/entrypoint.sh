#!/bin/sh
set -eu

source /app/.env
export TINYBIRD_TRACKER_TOKEN="$TINYBIRD_TRACKER_TOKEN"

exec "$@"
