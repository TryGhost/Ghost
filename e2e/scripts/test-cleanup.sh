#!/bin/bash

echo "Stopping e2e test environment..."
docker compose --profile e2e down

echo "Test environment stopped."
