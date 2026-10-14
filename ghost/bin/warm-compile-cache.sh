#!/usr/bin/env bash

# Warms Node's on-disk V8 compile cache by booting Ghost once, so the modules don't
# have to be compiled again on every boot. Run at image build time: Ghost's own
# Dockerfile does it, and images built on top should re-run it after adding code
# (custom adapters, patches) so those modules land in the cache too.
#
# Cache entries are keyed by absolute module path, Node version and arch, so the
# warming build must use the same app directory and base image as the runtime.
#
#   NODE_COMPILE_CACHE   cache location; defaults to <app>/.compile-cache

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE_DIR="${NODE_COMPILE_CACHE:-${APP_DIR}/.compile-cache}"

mkdir -p "$CACHE_DIR"
# Node writes nothing and reports no error when the directory isn't writable, so a
# warming run would silently do nothing.
if [ ! -w "$CACHE_DIR" ]; then
    echo "Compile cache directory is not writable: ${CACHE_DIR}" >&2
    exit 1
fi

count_entries() {
    find "$CACHE_DIR" -type f | wc -l | tr -d ' '
}

before="$(count_entries)"

cd "$APP_DIR"

# Boot reaches the database before most services load, so warming without a working
# one silently caches under half the modules. No database is reachable during a build,
# so default to a throwaway sqlite one.
if [ -z "${database__client:-}" ]; then
    warm_db="$(mktemp "${TMPDIR:-/tmp}/ghost-warm-db.XXXXXX")"
    trap 'rm -f "$warm_db"' EXIT
    export database__client="better-sqlite3"
    export database__connection__filename="$warm_db"
fi

# Boot writes into content/ (logs, settings); put it back so warming leaves no trace
# in the image. stdout logging keeps most of it from happening in the first place.
content_snapshot="$(mktemp -d "${TMPDIR:-/tmp}/ghost-warm-content.XXXXXX")"
cp -a content/. "$content_snapshot"

NODE_ENV="${NODE_ENV:-production}" \
    NODE_COMPILE_CACHE="$CACHE_DIR" \
    GHOST_CI_SHUTDOWN_AFTER_BOOT=1 \
    logging__transports='["stdout"]' \
    node index.js

rm -rf content
mkdir content
cp -a "$content_snapshot/." content
rm -rf "$content_snapshot"

echo "Compile cache warmed: ${before} -> $(count_entries) entries in ${CACHE_DIR}"
