#!/bin/bash
# Setup steps for running Ghost in Claude Code on the web (or any similar
# remote sandbox). Wire this into the environment's "Setup" command so it
# runs before each session.
#
# Local developers do not need this; `pnpm setup` plus a working Docker
# daemon is enough on a normal workstation.

set -euo pipefail

# Move to the repo root. Setup hooks run from a cwd outside the checkout,
# so try in order:
#   1. CLAUDE_PROJECT_DIR (set by Claude Code in hooks/sessions)
#   2. git rev-parse (works when invoked from inside the checkout)
#   3. /home/user/Ghost (the canonical path in Claude Code on the web)
if [ -n "${CLAUDE_PROJECT_DIR:-}" ] && [ -d "$CLAUDE_PROJECT_DIR/.git" ]; then
    cd "$CLAUDE_PROJECT_DIR"
elif repo_root="$(git rev-parse --show-toplevel 2>/dev/null)" && [ -n "$repo_root" ]; then
    cd "$repo_root"
elif [ -d /home/user/Ghost/.git ]; then
    cd /home/user/Ghost
else
    echo "error: could not locate Ghost checkout (set CLAUDE_PROJECT_DIR or run from inside the repo)" >&2
    exit 1
fi

echo "==> Enabling pnpm via corepack"
corepack enable pnpm

echo "==> Pointing theme submodules at github.com directly"
# The repo's submodule URLs are relative (../../TryGhost/<theme>.git) and
# resolve against the parent's origin, which in this sandbox is a local git
# proxy whose allowlist excludes the theme repos. Override per-clone so the
# fetch goes straight to GitHub.
git submodule sync
git config submodule.ghost/core/content/themes/casper.url https://github.com/TryGhost/Casper.git
git config submodule.ghost/core/content/themes/source.url https://github.com/TryGhost/Source.git

echo "==> Installing workspace dependencies and theme submodules (pnpm setup)"
pnpm run setup

echo "==> Starting dockerd if it isn't already running"
if ! docker info >/dev/null 2>&1; then
    nohup dockerd > /tmp/dockerd.log 2>&1 &
    disown
    for _ in $(seq 1 60); do
        if docker info >/dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    if ! docker info >/dev/null 2>&1; then
        echo "dockerd failed to come up within 60s; see /tmp/dockerd.log" >&2
        exit 1
    fi
fi

echo "==> Staging host proxy CAs into Docker dev build contexts"
# The dev-gateway and ghost-dev Dockerfiles COPY this directory into the
# image's trust store before any HTTPS-using build step. The directory is
# empty in upstream checkouts; populate it from the host's CA bundle so
# builds can verify TLS through the sandbox's intercepting egress proxy.
for dest in docker/dev-gateway/sandbox-ca docker/ghost-dev/sandbox-ca; do
    mkdir -p "$dest"
    if compgen -G "/usr/local/share/ca-certificates/*.crt" >/dev/null; then
        cp /usr/local/share/ca-certificates/*.crt "$dest/"
    fi
done

echo "==> Setup complete"
