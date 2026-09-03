#!/bin/bash

set -euo pipefail

# Configure Ghost to use Tinybird Local
# Sources tokens from /mnt/shared-config/.env.tinybird created by tb-cli
if [ -f /mnt/shared-config/.env.tinybird ]; then
    source /mnt/shared-config/.env.tinybird
    if [ -n "${TINYBIRD_WORKSPACE_ID:-}" ] && [ -n "${TINYBIRD_ADMIN_TOKEN:-}" ]; then
        export tinybird__workspaceId="$TINYBIRD_WORKSPACE_ID"
        export tinybird__adminToken="$TINYBIRD_ADMIN_TOKEN"
        echo "Tinybird configuration loaded successfully"
    else
        echo "WARNING: Tinybird not enabled: Missing required environment variables in .env.tinybird" >&2
    fi
else
    echo "WARNING: Tinybird not enabled: .env.tinybird file not found at /mnt/shared-config/.env.tinybird" >&2
fi


# Configure Stripe webhook secret
if [ -f /mnt/shared-config/.env.stripe ]; then
    source /mnt/shared-config/.env.stripe
    if [ -n "${STRIPE_WEBHOOK_SECRET:-}" ]; then
        export WEBHOOK_SECRET="$STRIPE_WEBHOOK_SECRET"
        echo "Stripe webhook secret configured successfully"
    else
        echo "WARNING: Stripe webhook secret not found in shared config"
    fi
fi

# When Docker stops this container it sends a stop signal to the first process, which
# is this script. Ghost runs several processes below it (pnpm, nodemon and their
# shells), and none of them pass the signal on. Without the handling below Ghost is
# killed outright and never runs its shutdown work. So this script stays as the first
# process, sends the stop signal straight to Ghost, waits for it to finish, and only
# then lets the others exit.
GHOST_COMMAND='node --conditions=source --import=tsx index.js' # nodemon.json exec
SHUTDOWN_WAIT_SECONDS=30

ghost_pid() {
    local proc cmdline cwd
    for proc in /proc/[0-9]*; do
        cmdline=$(tr '\0' ' ' < "$proc/cmdline" 2>/dev/null || true)
        [ "${cmdline% }" = "$GHOST_COMMAND" ] || continue
        cwd=$(readlink "$proc/cwd" 2>/dev/null || true)
        [[ "$cwd" == */ghost/core ]] || continue
        echo "${proc#/proc/}"
        return
    done
}

# A process that has exited but not yet been collected by its parent still has an
# entry under /proc with state Z. Treat it as exited.
has_exited() {
    local state
    state=$(awk '{print $3}' "/proc/$1/stat" 2>/dev/null || true)
    [ -z "$state" ] || [ "$state" = "Z" ]
}

wait_for_exit() {
    local pid=$1 deadline=$2
    while ! has_exited "$pid" && [ "$SECONDS" -lt "$deadline" ]; do
        sleep 0.2
    done
    has_exited "$pid"
}

child=""
shutdown() {
    # One time limit for everything below, so it finishes within the stop_grace_period
    # that compose.dev.yaml gives this container.
    local pid deadline=$((SECONDS + SHUTDOWN_WAIT_SECONDS))
    pid=$(ghost_pid || true)
    if [ -n "$pid" ]; then
        echo "Stopping Ghost (pid $pid) before the container exits"
        kill -TERM "$pid" 2>/dev/null || true
        wait_for_exit "$pid" "$deadline" || echo "Ghost did not stop within ${SHUTDOWN_WAIT_SECONDS}s"
    fi
    if [ -n "$child" ]; then
        kill -TERM "$child" 2>/dev/null || true
        wait_for_exit "$child" "$deadline" || kill -KILL "$child" 2>/dev/null || true
        wait "$child" 2>/dev/null || true
    fi
    exit 0
}
trap shutdown TERM INT

"$@" &
child=$!
wait "$child"
