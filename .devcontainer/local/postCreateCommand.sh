#!/bin/bash
# Runs in the devcontainer after it's created
set -e

echo "Initializing the database..."
yarn knex-migrator init