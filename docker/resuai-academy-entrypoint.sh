#!/bin/sh
set -eu

mkdir -p /var/lib/ghost/content/themes/resuai-academy
cp -R /opt/resuai-academy/. /var/lib/ghost/content/themes/resuai-academy/
chown -R node:node /var/lib/ghost/content/themes/resuai-academy

exec /usr/local/bin/docker-entrypoint.sh "$@"
