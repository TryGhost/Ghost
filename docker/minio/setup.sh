#!/bin/sh
set -euo pipefail

BUCKET=${MINIO_BUCKET:-ghost-dev}
REDIRECTS_BUCKET=${MINIO_REDIRECTS_BUCKET:-ghost-dev-redirects}

echo "Configuring MinIO alias..."
mc alias set local http://minio:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

echo "Ensuring bucket '${BUCKET}' exists..."
mc mb --ignore-existing "local/${BUCKET}"

echo "Setting anonymous download policy on '${BUCKET}'..."
mc anonymous set download "local/${BUCKET}"

echo "Ensuring redirects bucket '${REDIRECTS_BUCKET}' exists..."
mc mb --ignore-existing "local/${REDIRECTS_BUCKET}"

echo "MinIO setup complete."
