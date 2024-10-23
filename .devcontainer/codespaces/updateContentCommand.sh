#!/bin/bash

set -e

echo "Updating git submodules..."
git submodule update --init --recursive
