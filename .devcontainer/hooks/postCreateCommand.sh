#!/bin/bash
# Runs in the devcontainer after it's created
set -e
echo "Installing dependencies..."
yarn install --check-files

echo "Clearing the build cache..."
yarn nx reset --only-cache
yarn nx reset --only-workspace-data

echo "Building typescript packages..."
yarn nx run-many -t build:ts

echo "Initializing the database..."
yarn knex-migrator init