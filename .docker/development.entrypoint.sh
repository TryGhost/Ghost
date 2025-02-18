#!/bin/bash

# Adjust local configuration
node /home/ghost/.github/scripts/setup-docker.js

# Run migrations
yarn knex-migrator init

# Execute the CMD
exec "$@"