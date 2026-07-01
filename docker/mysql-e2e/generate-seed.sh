#!/usr/bin/env bash
set -euo pipefail

# Generates a pre-initialized MySQL data dir for the E2E pre-seeded image.
#
# The E2E suite runs MySQL on tmpfs, which is empty on every run, so the stock
# image re-runs first-boot initialization (~several seconds, CPU-bound) each time.
# This script runs the stock image once through its official entrypoint — the
# authoritative init path — then captures the resulting data dir. Dockerfile bakes
# it in and seed-entrypoint.sh copies it into the empty tmpfs at container start,
# so mysqld sees a populated dir and skips init.
#
# Credentials/DB below match compose.dev.yaml's mysql service defaults. Because the
# pre-seeded image skips the entrypoint's first-init, anything not created here
# (users, root@'%' for cross-container access) won't exist at runtime — so this must
# stay in sync with those defaults.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/compose.dev.yaml"
SEED_DIR="$SCRIPT_DIR/seed"

# Read the pinned image + tuning flags from compose.dev.yaml so the seed always
# matches the mysql the E2E stack actually runs (yq is preinstalled on CI runners).
MYSQL_IMAGE="${MYSQL_IMAGE:-$(yq '.services.mysql.image' "$COMPOSE_FILE")}"
MYSQL_COMMAND="$(yq '.services.mysql.command' "$COMPOSE_FILE")"

echo "Generating MySQL seed"
echo "  image:   $MYSQL_IMAGE"
echo "  command: $MYSQL_COMMAND"
echo "  output:  $SEED_DIR"

rm -rf "$SEED_DIR"

# MYSQL_COMMAND is intentionally unquoted: it holds space-separated mysqld flags
# that must reach the container as separate arguments.
# shellcheck disable=SC2086
cid="$(docker run -d \
    -e MYSQL_ROOT_PASSWORD=root \
    -e MYSQL_DATABASE=ghost_dev \
    -e MYSQL_USER=ghost \
    -e MYSQL_PASSWORD=ghost \
    "$MYSQL_IMAGE" $MYSQL_COMMAND)"

cleanup() { docker rm -f "$cid" >/dev/null 2>&1 || true; }
trap cleanup EXIT

echo "Waiting for first-boot initialization to complete..."
for _ in $(seq 1 240); do
    if docker exec "$cid" mysql -uroot -proot -e "SELECT 1" >/dev/null 2>&1; then
        ready=1
        break
    fi
    sleep 0.5
done
if [[ "${ready:-}" != "1" ]]; then
    echo "MySQL did not become ready in time" >&2
    docker logs "$cid" >&2 || true
    exit 1
fi

# Clean shutdown so the captured data dir is consistent, then copy it out.
docker exec "$cid" mysql -uroot -proot -e "SHUTDOWN" >/dev/null 2>&1 || true
docker wait "$cid" >/dev/null
docker cp "$cid:/var/lib/mysql" "$SEED_DIR"

echo "Seed written to $SEED_DIR ($(du -sh "$SEED_DIR" | cut -f1))"
