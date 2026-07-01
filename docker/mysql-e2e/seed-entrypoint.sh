#!/bin/bash
set -e

# When the data dir is empty (E2E mounts it as a fresh tmpfs), seed it from the
# baked, already-initialized data dir before handing off to the stock entrypoint.
# mysqld then sees a populated dir and skips first-boot initialization. When the
# dir is already populated (e.g. a persistent volume), this is a no-op and the
# stock behavior is unchanged.
if [ -z "$(ls -A /var/lib/mysql 2>/dev/null)" ]; then
    cp -a /var/lib/mysql-seed/. /var/lib/mysql/
fi

exec docker-entrypoint.sh "$@"
