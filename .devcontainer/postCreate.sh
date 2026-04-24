#!/usr/bin/env bash
set -euo pipefail

cd /workspaces/Ghost

corepack enable
corepack prepare --activate

git submodule update --init --recursive

pnpm install --prefer-offline
