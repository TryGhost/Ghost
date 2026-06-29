FROM caddy:2.11.4-builder-alpine@sha256:b6a94e74b72261bd536b35acdd22f3577d4e466a9550f2c8d6c8ed6413085d72 AS builder

RUN xcaddy build --with github.com/caddyserver/transform-encoder@ba4124974830222da7f12a091cf11ddf4d49363f

FROM caddy:2-alpine@sha256:5f5c8640aae01df9654968d946d8f1a56c497f1dd5c5cda4cf95ab7c14d58648

COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Default proxy targets (can be overridden via environment variables)
ENV GHOST_BACKEND=ghost-dev:2368 \
    ADMIN_DEV_SERVER=host.docker.internal:5174 \
    ADMIN_LIVE_RELOAD_SERVER=host.docker.internal:4200 \
    PORTAL_DEV_SERVER=host.docker.internal:4175 \
    COMMENTS_DEV_SERVER=host.docker.internal:7173 \
    SIGNUP_DEV_SERVER=host.docker.internal:6174 \
    SEARCH_DEV_SERVER=host.docker.internal:4178 \
    ANNOUNCEMENT_DEV_SERVER=host.docker.internal:4177 \
    ADMIN_TOOLBAR_DEV_SERVER=host.docker.internal:4176 \
    LEXICAL_DEV_SERVER=host.docker.internal:4173 \
    ANALYTICS_PROXY_TARGET=analytics:3000 \
    ACTIVITYPUB_PROXY_TARGET=host.docker.internal:8080

COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 2368
