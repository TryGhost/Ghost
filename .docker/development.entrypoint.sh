#!/bin/bash

# Adjust local configuration
node /home/ghost/.github/scripts/setup-docker.js

# Execute the CMD
exec "$@"