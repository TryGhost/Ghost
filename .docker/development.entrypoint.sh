#!/bin/bash


yarn nx reset

# Check if portal service is running by attempting DNS resolution
if getent hosts portal > /dev/null 2>&1; then
  # If portal service exists, set the environment variable
  export portal__url="http://localhost:4175/portal.min.js"
  echo "Portal service detected - enabling portal integration"
fi

# Execute the CMD
exec "$@"
