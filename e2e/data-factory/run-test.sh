#!/bin/bash

# Simple script to run the database connection test

echo "Running Data Factory Database Connection Test..."
echo "=============================================="

# Change to the e2e directory
cd "$(dirname "$0")/.."

# Ensure dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Compile TypeScript
echo "Compiling TypeScript..."
npm run build

# Run the test
echo "Running test..."
node build/data-factory/utils/test-db-connection.js