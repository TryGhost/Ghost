FROM python:3.13-slim@sha256:e544a7fcbdf8555eceda66bf86cafb006c736339f76141918bcb812f3174c00a

# Install uv from Astral.sh
COPY --from=ghcr.io/astral-sh/uv:0.11.6@sha256:b1e699368d24c57cda93c338a57a8c5a119009ba809305cc8e86986d4a006754 /uv /uvx /bin/

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    jq \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /home/tinybird

RUN uv tool install tinybird@0.0.1.dev285 --python 3.13 --force

ENV PATH="/root/.local/bin:$PATH"

COPY docker/tb-cli/entrypoint.sh /usr/local/bin
RUN chmod +x /usr/local/bin/entrypoint.sh
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
