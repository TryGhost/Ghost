FROM caddy:2.11.4-builder-alpine@sha256:8e89605351333ad2cc2f3bcc95275a2ccc427f88914050e86a5fde0fd77a63c4 AS builder

RUN xcaddy build --with github.com/caddyserver/transform-encoder@ba4124974830222da7f12a091cf11ddf4d49363f

FROM caddy:2-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648

COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Default proxy targets (can be overridden via environment variables).
# Public apps (portal, comments-ui, signup-form, sodo-search,
# announcement-bar, admin-toolbar) are served directly from their umd/
# build output via the Caddyfile's file_server block, not proxied to a
# dev server — they have no *_DEV_SERVER entry here.
ENV GHOST_BACKEND=ghost-dev:2368 \
    ADMIN_DEV_SERVER=host.docker.internal:5174 \
    ADMIN_LIVE_RELOAD_SERVER=host.docker.internal:4200 \
    LEXICAL_DEV_SERVER=host.docker.internal:4173 \
    ANALYTICS_PROXY_TARGET=analytics:3000 \
    ACTIVITYPUB_PROXY_TARGET=host.docker.internal:8080

COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 2368
