FROM caddy:2-alpine

RUN caddy add-package github.com/caddyserver/transform-encoder

# Default proxy targets (can be overridden via environment variables)
ENV GHOST_BACKEND=ghost-dev:2368 \
    ADMIN_DEV_SERVER=host.docker.internal:5173 \
    ADMIN_LIVE_RELOAD_SERVER=host.docker.internal:4200 \
    PORTAL_DEV_SERVER=host.docker.internal:4175 \
    COMMENTS_DEV_SERVER=host.docker.internal:7173 \
    SIGNUP_DEV_SERVER=host.docker.internal:6174 \
    SEARCH_DEV_SERVER=host.docker.internal:4178 \
    ANNOUNCEMENT_DEV_SERVER=host.docker.internal:4177 \
    LEXICAL_DEV_SERVER=host.docker.internal:4173

COPY Caddyfile /etc/caddy/Caddyfile
EXPOSE 80 2368
