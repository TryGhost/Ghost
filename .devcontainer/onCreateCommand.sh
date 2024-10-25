#!/bin/bash

set -e

echo "Setting up local config file..."
node .devcontainer/createLocalConfig.js

echo "Cleaning up any previous installs..."
yarn clean:hard

echo "Installing dependencies..."
yarn install

echo "Updating git submodules..."
git submodule update --init --recursive

echo "Building typescript packages..."
yarn nx run-many -t build:ts