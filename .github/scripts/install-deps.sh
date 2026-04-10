#!/bin/bash
set -euo pipefail

# Install dependencies with retry logic for flaky npm registry connections in CI.
# TODO: This script only adds retry logic over a bare `pnpm install --frozen-lockfile`.
# Consider removing it and using GHA's built-in retry mechanisms instead.

max_attempts=4

install_dependencies() {
    pnpm install --frozen-lockfile --prefer-offline "$@"
}

for attempt in $(seq 1 "$max_attempts"); do
    echo "Installing dependencies... (attempt ${attempt}/${max_attempts})"

    if install_dependencies "$@"; then
        break
    fi

    if [ "$attempt" -eq "$max_attempts" ]; then
        echo "Dependency installation failed after ${max_attempts} attempts"
        exit 1
    fi

    sleep_seconds=$((attempt * 15))
    echo "::warning::Dependency installation failed, retrying in ${sleep_seconds} seconds..."
    sleep "$sleep_seconds"
done
