FROM bitnami/ghost:5.2.3-debian-11-r0

COPY ./core/frontend/meta/canonical-url.js /opt/bitnami/ghost/versions/5.2.3/core/frontend/meta/canonical-url.js
COPY ./content/entrypoint.sh /opt/bitnami/scripts/ghost/entrypoint.sh
