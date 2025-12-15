#!/bin/sh
set -euo pipefail

BUCKET=${MINIO_BUCKET:-ghost-dev}

echo "Configuring MinIO alias..."
mc alias set local http://minio:9000 "${MINIO_ROOT_USER}" "${MINIO_ROOT_PASSWORD}"

echo "Ensuring bucket '${BUCKET}' exists..."
mc mb --ignore-existing "local/${BUCKET}"

echo "Setting anonymous download policy on '${BUCKET}'..."
mc anonymous set download "local/${BUCKET}"

echo "MinIO bucket '${BUCKET}' ready."
