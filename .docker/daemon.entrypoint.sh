#!/bin/bash

echo "hello from daemon"

yarn nx reset

# Dynamically discover TypeScript packages
# This replicates the logic from .github/scripts/dev.js
echo "Discovering TypeScript packages..."
tsPackagesList=""
for dir in /home/ghost/ghost/*/; do
  packageJsonPath="${dir}package.json"
  if [ -f "$packageJsonPath" ]; then
    # Check if package.json has a build:ts script
    if grep -q '"build:ts"' "$packageJsonPath"; then
      packageName=$(basename "$dir")
      if [ -n "$tsPackagesList" ]; then
        tsPackagesList="${tsPackagesList},@tryghost/${packageName}"
      else
        tsPackagesList="@tryghost/${packageName}"
      fi
    fi
  fi
done

echo "Discovered packages: $tsPackagesList"

# Allow override through environment variable
: "${tsPackages:=$tsPackagesList}"

echo "Watching packages: $tsPackages"

# Function to handle cleanup when receiving a signal
cleanup() {
  echo "Received signal to terminate, shutting down gracefully..."

  # Kill any child processes
  if [ -n "$child_pid" ]; then
    kill -TERM "$child_pid" 2>/dev/null
  fi

  exit 0
}

# Set up traps for signals
trap cleanup SIGTERM SIGINT SIGQUIT

# Run the nx watch command in the background
yarn nx -- watch --projects=${tsPackages} -- nx run \$NX_PROJECT_NAME:build:ts &

# Store the PID of the background process
child_pid=$!

# Wait for the child process to terminate or a signal to be received
wait $child_pid
