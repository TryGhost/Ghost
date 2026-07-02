# syntax=docker/dockerfile:1
#
# Distilled tinybird-local for Ghost CI (~576MB compressed vs ~1.85GB upstream).
#
# Stage 1 prunes the upstream image (see cleanup.sh); stage 2 flattens the
# result into a single layer via `COPY --from`. The flatten is where most of the
# reduction comes from: upstream installs ClickHouse twice across separate
# layers, and a squashed rootfs keeps only the final copy.
#
# To track a new upstream release, bump TINYBIRD_LOCAL_REF to the new digest
# (keep it pinned by @sha256) and let the publish workflow rebuild.
ARG TINYBIRD_LOCAL_REF=tinybirdco/tinybird-local:latest@sha256:6f01c3da78ea96d166e2ff3aa91c3bbf1f9b9dc088214802525fbb193f6d3d52

FROM ${TINYBIRD_LOCAL_REF} AS pruned
COPY docker/tinybird-local-slim/cleanup.sh /tmp/cleanup.sh
RUN /tmp/cleanup.sh && rm /tmp/cleanup.sh

FROM scratch
COPY --from=pruned / /

# Re-declare the runtime config from the upstream image (a flatten drops metadata).
ENV PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin \
    CLICKHOUSE_VERSION=25.3.7.194 \
    CLICKHOUSE_CLUSTER_HOST=localhost \
    CLICKHOUSE_CLUSTER_HTTP_PORT=8123 \
    CLICKHOUSE_CLUSTER_INTERNAL_HOST=localhost \
    CLICKHOUSE_CLUSTER_INTERNAL_HTTP_PORT=8123 \
    CLICKHOUSE_INTERNAL_PORT=8123 \
    USE_GATHERER=False
WORKDIR /app
EXPOSE 7181 7182
HEALTHCHECK --interval=10s --timeout=5s --start-period=30s --retries=10 \
    CMD tb --output json --cloud sql 'SELECT 1 AS healthcheck' | grep '"healthcheck": 1' || exit 1
CMD ["/usr/bin/supervisord"]
