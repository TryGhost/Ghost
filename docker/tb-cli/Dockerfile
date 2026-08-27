# The Tinybird CLI requires >=3.10,<3.14 — keep the base image in that range.
# Renovate is capped at <3.14 for this file (.github/renovate.json5).
FROM python:3.13-slim@sha256:ffb752e139c0a19692a43af8d8523b274222dd68eebad5d583b45c2201c6e30a

# Install uv from Astral.sh
COPY --from=ghcr.io/astral-sh/uv:0.11.6@sha256:b1e699368d24c57cda93c338a57a8c5a119009ba809305cc8e86986d4a006754 /uv /uvx /bin/

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    jq \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/tinybird

# Held at 4.6.13: 4.6.14 ingests a nested JSON object into a String column as
# ClickHouse Tuple syntax instead of raw JSON, so JSONExtractString on
# `analytics_events.payload` returns '' (see .github/workflows/tinybird.yml).
# renovate: datasource=pypi depName=tinybird versioning=pep440
ARG TINYBIRD_VERSION=4.6.13

RUN uv tool install tinybird@${TINYBIRD_VERSION} --python 3.13 --force

ENV PATH="/root/.local/bin:$PATH"

COPY docker/tb-cli/entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
