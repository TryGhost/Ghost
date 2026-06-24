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

# Sync pnpm config snapshots from the host into the container's writable
# filesystem, then re-strip enableGlobalVirtualStore (host has it on for the
# local-dev shared vstore; container needs it off — same reason as the
# Dockerfile sed).
for f in pnpm-lock.yaml pnpm-workspace.yaml package.json; do
    if [ -f "/home/ghost/${f}.host" ]; then
        cp "/home/ghost/${f}.host" "/home/ghost/${f}"
    fi
done
if [ -f /home/ghost/pnpm-workspace.yaml ]; then
    sed -i '/^enableGlobalVirtualStore:/d' /home/ghost/pnpm-workspace.yaml
    # Mirror the Dockerfile guard: fail loud if the strip didn't take (e.g.
    # host workspace.yaml reformatted the key with indentation or a comment
    # prefix). Container would otherwise install with vstore on and dangle
    # symlinks across the host store mount.
    # Detector is intentionally wider than the strip's `^` anchor: an
    # indented `  enableGlobalVirtualStore: true` would bypass the sed AND
    # bypass a BOL-anchored grep, letting vstore-on slip through silently
    # if pnpm happens to accept the resulting YAML.
    if grep -qE '^[[:space:]]*enableGlobalVirtualStore' /home/ghost/pnpm-workspace.yaml; then
        echo "ERROR: enableGlobalVirtualStore strip in entrypoint failed — host pnpm-workspace.yaml may have reformatted the key. Check the file format." >&2
        exit 1
    fi
fi

# Lockfile-drift auto-install: if the host lockfile differs from what was
# installed last (marker written at image build + after each in-container
# install), reinstall to bring the named-volume node_modules back in sync.
# Saves contributors from having to run `pnpm docker:refresh-deps` after
# every host-side dep change.
LOCK_HASH=$(sha256sum /home/ghost/pnpm-lock.yaml | awk '{print $1}')
MARKER=/home/ghost/node_modules/.lockfile-hash
if [ ! -f "$MARKER" ] || [ "$(cat "$MARKER")" != "$LOCK_HASH" ]; then
    echo "Lockfile drift detected; running pnpm install in container (run 'pnpm docker:refresh-deps' on the host if this fails)..."
    # `pnpm -C` instead of `cd && pnpm` so the entrypoint's cwd stays at the
    # Dockerfile WORKDIR (/home/ghost/ghost/core). `exec "$@"` below inherits
    # the cwd; a stray `cd /home/ghost` would make `pnpm dev` resolve to the
    # root workspace script (which calls docker compose from inside the
    # container) instead of ghost/core's nodemon.
    pnpm -C /home/ghost install --frozen-lockfile
    echo "$LOCK_HASH" > "$MARKER"
fi

# Execute the CMD
exec "$@"

