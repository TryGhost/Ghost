#!/bin/bash

# Clean yarn cache
echo "Cleaning yarn cache..."
if [ "$IS_DEVCONTAINER" = "true" ]; then
    # In devcontainer, these directories are mounted from the host so we can't delete them — only their contents
    rm -rf .yarncache/* .yarncachecopy/*
else
    yarn cache clean
fi

# Reset Nx
echo "Resetting NX cache..."
rm -rf .nxcache .nx

# Recursively delete all node_modules directories
echo "Deleting all node_modules directories..."
find . -name "node_modules" -type d -prune -exec rm -rf '{}' +

echo "Deleting all build artifacts..."
find ./ghost -type d -name "build" -exec rm -rf '{}' +
find ./ghost -type d -name "tsconfig.tsbuildinfo" -exec rm -rf '{}' +

echo "Cleanup complete!"
