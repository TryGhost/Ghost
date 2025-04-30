#!/bin/bash

echo "hello from daemon"

# Default value for tsPackages if not provided as an environment variable
: "${tsPackages:=@tryghost/post-revisions,@tryghost/post-events}"

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
