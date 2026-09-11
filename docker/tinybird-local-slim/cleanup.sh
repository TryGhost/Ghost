#!/usr/bin/env bash
#
# Distills the upstream tinybirdco/tinybird-local image for Ghost CI use.
#
# The image is proprietary (Tinybird License, Self-Managed — /LICENSE.md in the
# image). Derivative works are permitted, so long as they do not remove license
# enforcement, auditing, or proprietary notices; /LICENSE.md and the third-party
# copyright files are deliberately left in place.
#
# It only removes things Ghost provably does not use. Every Python runtime
# dependency is kept on purpose: the (closed-source) Tinybird server imports its
# entire feature surface eagerly at boot (LLM, GCP connectors, scipy, ...), so
# pruning "unused" packages breaks startup. The shipped __pycache__ is kept for
# the same reason: deleting it makes every boot recompile the tree. Most of the
# size win instead comes from flattening the result to a single layer (the
# `FROM scratch` stage in the Dockerfile), which drops the ClickHouse install the
# upstream image bakes in twice across separate layers.
set -euo pipefail

SUPERVISORD=/etc/supervisor/conf.d/supervisord.conf

# Drop the supervisord programs Ghost never exercises (Kafka ingestion + MCP/AI
# server). Editing the shipped config in-place keeps this robust to upstream
# version bumps rather than committing a copy that can drift.
awk 'BEGIN{RS="";ORS="\n\n"} !/\[program:tinybird-kafka\]/ && !/\[program:tinybird-mcp\]/' \
    "$SUPERVISORD" > "$SUPERVISORD.slim"
mv "$SUPERVISORD.slim" "$SUPERVISORD"

# Build toolchain / linkers — runtime-unnecessary (the image ships prebuilt wheels).
rm -rf /usr/lib/gcc /usr/bin/gcc* /usr/bin/g++* /usr/bin/*-gcc* /usr/bin/*-g++* \
       /usr/bin/cpp* /usr/bin/*-cpp* /usr/bin/x86_64-linux-gnu-lto-dump* \
       /usr/bin/x86_64-linux-gnu-gcc* /usr/bin/x86_64-linux-gnu-g++*

# Package installers + VCS/transfer tools not used at runtime.
rm -rf /usr/bin/uv /usr/bin/uvx \
       /usr/bin/git /usr/lib/git-core /usr/share/git-core \
       /usr/bin/rsync /usr/bin/ssh /usr/bin/scp

# Apt metadata and caches. /usr/share/doc stays: it is only ~6MB, and it holds
# the Debian copyright files for the third-party packages the image bundles.
rm -rf /var/lib/apt/lists/* /var/cache/apt/* /root/.cache

# Clear log *files* but keep the dirs supervisord + services expect to exist.
find /var/log -type f -delete 2>/dev/null || true
mkdir -p /var/log/supervisor /var/log/clickhouse-server /var/log/nginx /var/log/redis
