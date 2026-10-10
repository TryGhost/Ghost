FROM caddy:2.11.4-builder-alpine@sha256:0aa610043dab5da82ad0a0268e46bb852785e6f5160f12f1c6fe3f42903d7e1b AS builder

RUN xcaddy build --with github.com/caddyserver/transform-encoder@ba4124974830222da7f12a091cf11ddf4d49363f

FROM caddy:2-alpine@sha256:881bbc60f9986d5ab8e7cfd6cf7e4ef3c9c0439fef2429d035d065577882f028

COPY --from=builder /usr/bin/caddy /usr/bin/caddy

# Default proxy targets (can be overridden via environment variables).
# Public apps (portal, comments-ui, signup-form, sodo-search,
# announcement-bar, admin-toolbar) are served directly from their umd/
# build output via the Caddyfile's file_server block, not proxied to a
# dev server — they have no *_DEV_SERVER entry here.
ENV GHOST_BACKEND=ghost-dev:2368 \
    ADMIN_DEV_SERVER=host.docker.internal:5174 \
    LEXICAL_DEV_SERVER=host.docker.internal:4173 \
    ANALYTICS_PROXY_TARGET=analytics:3000 \
    ACTIVITYPUB_PROXY_TARGET=host.docker.internal:8080

COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 2368
