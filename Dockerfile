FROM bitnami/ghost:4.34.2-debian-10-r3

COPY ./core/frontend/meta/canonical-url.js /opt/bitnami/ghost/versions/4.34.2/core/frontend/meta/canonical-url.js
COPY ./content/entrypoint.sh /opt/bitnami/scripts/ghost/entrypoint.sh