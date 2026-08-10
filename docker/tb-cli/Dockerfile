# The Tinybird CLI requires >=3.10,<3.14 — keep the base image in that range.
# Renovate is capped at <3.14 for this file (.github/renovate.json5).
FROM python:3.13-slim@sha256:6771159cd4fa5d9bba1258caf0b82e6b73458c694d178ad97c5e925c2d0e1a91

# Install uv from Astral.sh
COPY --from=ghcr.io/astral-sh/uv:0.11.6@sha256:b1e699368d24c57cda93c338a57a8c5a119009ba809305cc8e86986d4a006754 /uv /uvx /bin/

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    jq \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/tinybird

# renovate: datasource=pypi depName=tinybird versioning=pep440
ARG TINYBIRD_VERSION=4.6.14

RUN uv tool install tinybird@${TINYBIRD_VERSION} --python 3.13 --force

ENV PATH="/root/.local/bin:$PATH"

COPY docker/tb-cli/entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
