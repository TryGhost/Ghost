#!/bin/bash

set -e

echo "Installing dependencies..."
yarn install

echo "Setting up local config file..."
node .devcontainer/createLocalConfig.js

echo "Updating git submodules..."
git submodule update --init --recursive

echo "Resetting NX cache..."
yarn nx reset --cache-only
yarn nx reset --workspace-only

echo "Building typescript packages..."
yarn nx run-many -t build:ts

echo "Running unit tests..."
yarn test:unit

# echo "Building Ghost admin..."
# yarn nx run ghost-admin:build