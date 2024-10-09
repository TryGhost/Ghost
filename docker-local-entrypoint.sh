#!/bin/bash

find node_modules -type f -name "*.node"-print | xargs rm -rf

yarn install

yarn nx reset

exec "$@"
