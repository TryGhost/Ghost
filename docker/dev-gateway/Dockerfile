FROM caddy:2-alpine@sha256:86deaf5e3d3408a6ccec08fbb79989783dd26e206ae10bcf78a801dc8c9ab794

RUN caddy add-package github.com/caddyserver/transform-encoder

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
