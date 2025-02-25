#!/bin/bash
yarn nx reset --onlyDaemon
yarn nx daemon --start

exec "$@"