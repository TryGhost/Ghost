#!/bin/bash

set -e

echo "Setting up environment variables..."
if [ "$CODESPACES" = "true" ]; then
    echo "Adding Ghost URL to ~/.zshrc for Codespaces environment..."
    echo "export url=https://\${CODESPACE_NAME}-2368.\${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}" >> ~/.zshrc
fi
source ~/.zshrc

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