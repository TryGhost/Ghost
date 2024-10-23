#!/bin/bash

set -e

echo "Cleaning up any previous installs..."
yarn clean:hard

echo "Installing dependencies..."
yarn install

echo "Setting up local config file..."
node .devcontainer/local/createLocalConfig.js

echo "Updating git submodules..."
git submodule update --init --recursive

echo "Building typescript packages..."
yarn nx run-many -t build:ts

echo "Running unit tests..."
yarn nx run-many -t test:unit