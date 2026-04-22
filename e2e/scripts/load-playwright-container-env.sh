#!/usr/bin/env bash

if [[ "${BASH_SOURCE[0]}" == "$0" ]]; then
    echo "This script must be sourced, not executed" >&2
    exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

PLAYWRIGHT_VERSION="$(node -p 'require("./e2e/package.json").devDependencies["@playwright/test"]')"
PLAYWRIGHT_IMAGE="mcr.microsoft.com/playwright:v${PLAYWRIGHT_VERSION}-noble"
WORKSPACE_PATH="${GITHUB_WORKSPACE:-$REPO_ROOT}"

export SCRIPT_DIR
export REPO_ROOT
export PLAYWRIGHT_VERSION
export PLAYWRIGHT_IMAGE
export WORKSPACE_PATH
