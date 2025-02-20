#!/bin/bash

trap 'kill -TERM $child' TERM INT

# Execute the CMD
exec "$@" &

child=$!
wait $child