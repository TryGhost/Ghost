#!/bin/bash

set -e

echo "Setting up local config file..."
if [ "$CODESPACES" = "true" ]; then
    CONFIG_FILE="ghost/core/config.local.json"
    if [ ! -f "$CONFIG_FILE" ]; then
        echo "Creating $CONFIG_FILE..."
        URL="https://$CODESPACE_NAME-2368.$GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN"
        echo "{
    \"url\": \"$URL\"
}" > "$CONFIG_FILE"
    else
        echo "$CONFIG_FILE already exists. Skipping creation."
    fi
fi

echo "Updating git submodules..."
git submodule update --init --recursive

echo "Clearing the build cache..."
yarn nx reset --only-cache
yarn nx reset --only-workspace-data

echo "Building typescript packages..."
yarn nx run-many -t build:ts

echo "Running unit tests..."
yarn test:unit

echo "Building Ghost admin..."
yarn nx run ghost-admin:build