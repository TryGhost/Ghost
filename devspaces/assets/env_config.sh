#!/bin/bash

HOST=$1

sed -i 's/localhost:2368/'"$HOST"'/g' /opt/config.devspaces.json
mv -f /opt/config.devspaces.json /data/core/server/config/env/
echo "DevSpaces environment set up!"
