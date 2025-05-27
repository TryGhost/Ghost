#!/bin/bash

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Cleaning up test environment..."
    docker compose --profile e2e down
    echo "Test environment stopped."
}

# Set up trap to run cleanup on script exit
trap cleanup EXIT

echo "Starting e2e test environment..."

# Start services with e2e profile
docker compose --profile e2e up -d

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
max_attempts=60
attempt=0
while ! docker compose exec -T mysql mysql -uroot -proot -e "SELECT 1" &>/dev/null; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "MySQL failed to start after $max_attempts seconds"
        exit 1
    fi
    sleep 1
done
echo "MySQL is ready!"

# Create test database if it doesn't exist
echo "Setting up test database..."
docker compose exec -T mysql mysql -uroot -proot -e "CREATE DATABASE IF NOT EXISTS ghost_test;"

# Wait for ghost-test to be ready
echo "Waiting for Ghost test instance to be ready..."
max_attempts=120
attempt=0
while ! curl -f http://localhost:2369/ghost/api/admin/authentication/setup/ -H "Accept-Version: v5.0" &>/dev/null; do
    attempt=$((attempt + 1))
    if [ $attempt -ge $max_attempts ]; then
        echo "Ghost failed to start after $max_attempts seconds"
        echo "Ghost logs:"
        docker compose logs ghost-test --tail 50
        exit 1
    fi
    sleep 2
done
echo "Ghost is ready!"

# Set up environment variables for tests
export BASE_URL=http://localhost:2369
export MYSQL_DATABASE=ghost_test
export ADMIN_USERNAME=test@example.com
export ADMIN_PASSWORD=SuperSecure123!@#
export EMAIL_PROVIDER=mailhog
export MAILHOG_API_URL=http://localhost:8025

# Run the tests
echo "Running e2e tests..."
yarn test:e2e "$@"
