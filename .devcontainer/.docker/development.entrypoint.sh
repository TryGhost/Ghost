#!/bin/bash

if [ -z "$(ls -A ".yarncache")" ]; then
    cp -r /workspaces/ghost/.yarncachecopy/* /workspaces/ghost/.yarncache/
fi

exec "$@"
