# syntax=docker/dockerfile:1
#
# Distilled tinybird-local for Ghost CI. See README.md in this directory.
#
# Stage 1 prunes the upstream image (see cleanup.sh); stage 2 flattens the
# result into a single layer via `COPY --from`. The flatten is where the size
# reduction comes from: upstream installs ClickHouse twice across separate
# layers, and a squashed rootfs keeps only the final copy.
#
# TINYBIRD_LOCAL_REF has no default on purpose — compose.dev.analytics.yaml is
# the single source of truth for the upstream digest, and the publish workflow
# reads it from there. Pass it explicitly for local builds.
ARG TINYBIRD_LOCAL_REF

FROM ${TINYBIRD_LOCAL_REF} AS pruned
COPY docker/tinybird-local-slim/cleanup.sh /tmp/cleanup.sh
RUN /tmp/cleanup.sh && rm /tmp/cleanup.sh

FROM scratch
COPY --from=pruned / /

# A flatten drops the upstream image's config, so re-declare it here. The publish
# workflow diffs this against upstream and fails the build when they drift.
ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    CLICKHOUSE_VERSION=25.3.7.194 \
    CLICKHOUSE_CLUSTER_HOST=localhost \
    CLICKHOUSE_CLUSTER_HTTP_PORT=8123 \
    CLICKHOUSE_CLUSTER_INTERNAL_HOST=localhost \
    CLICKHOUSE_CLUSTER_INTERNAL_HTTP_PORT=8123 \
    CLICKHOUSE_INTERNAL_PORT=8123 \
    USE_GATHERER=False \
    MINIO_ROOT_USER=admin \
    MINIO_ROOT_PASSWORD=password
WORKDIR /app
EXPOSE 7181 7182
# Copied verbatim from upstream, notably the licence pointers — the flatten drops
# them, and they are proprietary notices we are not permitted to strip. Upstream's
# own `license` label says SSPL and contradicts the LICENSE.md the image ships
# (and license_url serves); it is reproduced as-is rather than corrected.
LABEL license="SSPL" \
      license_url="https://www.tinybird.co/docs/tb-local-license.txt" \
      org.opencontainers.image.ref.name="ubuntu" \
      org.opencontainers.image.version="22.04"
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=10 \
    CMD tb --output json --cloud sql 'SELECT 1 AS healthcheck' | grep '"healthcheck": 1' || exit 1
CMD ["/usr/bin/supervisord"]
