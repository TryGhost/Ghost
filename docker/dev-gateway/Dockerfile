FROM caddy:2.11.9-builder-alpine@sha256:d26fbc8a56ed8c3c1534f5573162d148ad3ed41732665da8526eb181fac0b728 AS builder

RUN xcaddy build --with github.com/caddyserver/transform-encoder@ba4124974830222da7f12a091cf11ddf4d49363f

FROM caddy:2-alpine@sha256:78bd35025c7ba85961dd149ae670315129954e77abe2383ac47c89106b35ade9

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
