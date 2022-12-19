#!/bin/sh
cd /app
unset PORT
export url="$UFFIZZI_URL"
export UFFIZZI_URL_WITH_ESCAPE_CHAR=$(echo $UFFIZZI_URL | sed "s/\//\\\\\//g")

sed -i "s/http:\/\/localhost:2368\"/${UFFIZZI_URL_WITH_ESCAPE_CHAR}\",\"server\": {\"port\": 2368},\"host\": \"127.0.0.1\"/g" /app/ghost/core/core/shared/config/env/config.development.json

yarn dev