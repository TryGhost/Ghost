#!/bin/bash

# Update git submodules
git submodule update --init --recursive

# Execute the CMD
exec "$@"