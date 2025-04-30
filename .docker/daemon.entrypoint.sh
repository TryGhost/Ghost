#!/bin/bash

yarn nx reset

# Dynamically discover TypeScript packages using nx show projects
echo "Discovering TypeScript packages..."
# Get all projects with the 'build' target
tsPackagesList=$(yarn --silent nx show projects --with-target=build | tr '\n' ',' | sed 's/,$//')

echo "Watching packages: $tsPackagesList"

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
yarn nx -- watch --projects=${tsPackagesList} -- nx run --disableNxCache \$NX_PROJECT_NAME:build &

# Store the PID of the background process
child_pid=$!

# Wait for the child process to terminate or a signal to be received
wait $child_pid
