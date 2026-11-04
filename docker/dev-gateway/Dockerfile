FROM caddy:2.11.7-builder-alpine@sha256:95a5e7e2692b5eb9545aadc5b90a39f6f509bee59c9508a493f83ee902eaef63 AS builder

RUN xcaddy build --with github.com/caddyserver/transform-encoder@ba4124974830222da7f12a091cf11ddf4d49363f

FROM caddy:2-alpine@sha256:e70b164da81ef698b3ad19af799ea6086ce6d9e48ed4079eb9fe26f6fbf14ee5

COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Default proxy targets (can be overridden via environment variables).
# Public apps (portal, comments-ui, signup-form, sodo-search,
# announcement-bar, admin-toolbar) are served directly from their umd/
# build output via the Caddyfile's file_server block, not proxied to a
# dev server — they have no *_DEV_SERVER entry here.
ENV GHOST_BACKEND=ghost-dev:2368 \
    ADMIN_DEV_SERVER=host.docker.internal:5174 \
    ANALYTICS_PROXY_TARGET=analytics:3000 \
    ACTIVITYPUB_PROXY_TARGET=host.docker.internal:8080

COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 2368
