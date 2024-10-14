#!/bin/bash

if [ -z "$(ls -A ".yarncache")" ]; then
    cp -r /home/ghost/.yarncachecopy/* /home/ghost/.yarncache/
fi

exec "$@"
