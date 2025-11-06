#!/bin/sh

# Entrypoint script for the Analytics service in compose.yml
## This script configures the environment for the Analytics service to use Tinybird local.
## It depends on the `tb-cli` service, which creates the `.env` file, which is mounted
## into the Analytics service container at `/app/.env`.

# Note: the analytics service's container is based on alpine, hence `sh` instead of `bash`.
set -eu

# Initialize child process variable
child=""

# Handle shutdown signals gracefully.
_term() {
    echo "Caught SIGTERM/SIGINT signal, shutting down gracefully..."
    if [ -n "$child" ]; then
        kill -TERM "$child" 2>/dev/null || true
        wait "$child" 2>/dev/null || true
    fi
    exit 0
}

# Set up signal handlers (POSIX-compliant signal names)
trap _term TERM INT

# Set the TINYBIRD_TRACKER_TOKEN environment variable from the .env file
# This file is created by the `tb-cli` service and mounted into the Analytics service container
if [ -f /mnt/shared-config/.env.tinybird ]; then
    . /mnt/shared-config/.env.tinybird
    if [ -n "${TINYBIRD_TRACKER_TOKEN:-}" ]; then
        export TINYBIRD_TRACKER_TOKEN="$TINYBIRD_TRACKER_TOKEN"
        echo "Tinybird tracker token configured successfully"
    else
        echo "WARNING: TINYBIRD_TRACKER_TOKEN not found in /mnt/shared-config/.env.tinybird" >&2
    fi
else
    echo "WARNING: /mnt/shared-config/.env.tinybird file not found - Tinybird tracking may not work" >&2
fi

# Start the process in the background
"$@" &
child=$!

# Wait for the child process
wait "$child"
