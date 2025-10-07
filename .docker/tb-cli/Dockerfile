FROM python:3.14-slim@sha256:eb37f58646a901dc7727cf448cae36daaefaba79de33b5058dab79aa4c04aefb

# Install uv from Astral.sh
COPY --from=ghcr.io/astral-sh/uv:0.8.13 /uv /uvx /bin/

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    jq \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/tinybird

RUN uv tool install tinybird@0.0.1.dev285 --python 3.13 --force

ENV PATH="/root/.local/bin:$PATH"

COPY .docker/tb-cli/entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
