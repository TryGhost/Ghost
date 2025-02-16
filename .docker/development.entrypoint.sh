#!/bin/bash

# Mounting local code into the container overwrites the `node_modules` directories
# so we need to install dependencies again
yarn install --frozen-lockfile --prefer-offline

yarn nx run-many -t build:ts

# Execute the CMD
exec "$@"