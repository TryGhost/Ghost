#!/bin/bash
git submodule update --init
docker compose up --attach ghost --no-log-prefix "$@"