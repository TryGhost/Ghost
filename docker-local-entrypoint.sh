#!/bin/bash

yarn global add rimraf
rimraf -g '**/node_modules'

yarn install

exec "$@"