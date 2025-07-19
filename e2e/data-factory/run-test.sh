#!/bin/bash

# Simple script to run the database connection test

echo "Running Data Factory Database Connection Test..."
echo "=============================================="

# Change to the e2e directory
cd "$(dirname "$0")/.."

# Load environment variables if .env exists
if [ -f "data-factory/.env" ]; then
    export $(cat data-factory/.env | grep -v '^#' | xargs)
fi

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