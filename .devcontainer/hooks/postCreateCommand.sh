#!/bin/bash
# Runs in the devcontainer after it's created
set -e

echo "Updating git submodules..."
git submodule update --init --recursive

echo "Installing dependencies..."
yarn install --check-files

echo "Initializing the database..."
yarn knex-migrator init

echo "Clearing the build cache..."
yarn nx reset --only-cache
yarn nx reset --only-workspace-data

echo "Building typescript packages..."
yarn nx run-many -t build:ts