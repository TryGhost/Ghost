#!/bin/bash

yarn install --frozen-lockfile --prefer-offline

# Execute the CMD
exec "$@"