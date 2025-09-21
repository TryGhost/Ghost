ARG NODE_VERSION=22.13.1

# --------------------
# Base Image
# --------------------
FROM node:$NODE_VERSION-bullseye-slim AS base
RUN apt-get update && \
    apt-get install -y \
    build-essential \
    curl \
    jq \
    libjemalloc2 \
    python3 \
    tar  \
    git &&  \
    curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | tee /usr/share/keyrings/stripe.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | tee -a /etc/apt/sources.list.d/stripe.list && \
    apt-get update && \
    apt-get install -y \
    stripe && \
    rm -rf /var/lib/apt/lists/* && \
    apt clean

# --------------------
# Development Base
# --------------------
FROM base AS development-base
WORKDIR /home/ghost

COPY package.json yarn.lock ./
COPY patches patches

RUN mkdir -p .yarnhash && md5sum yarn.lock | awk '{print $1}' > .yarnhash/yarn.lock.md5

# Copy everything for dependency graph (safer than per-file copies)
COPY apps apps
COPY ghost ghost
COPY e2e e2e

RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,id=yarn-cache \
    yarn install --frozen-lockfile --prefer-offline

# --------------------
# Shade Builder
# --------------------
FROM development-base AS shade-builder
WORKDIR /home/ghost
RUN cd apps/shade && yarn build

# --------------------
# Admin-x-design-system Builder
# --------------------
FROM development-base AS admin-x-design-system-builder
WORKDIR /home/ghost
RUN cd apps/admin-x-design-system && yarn build

# --------------------
# Admin-x-framework Builder
# --------------------
FROM development-base AS admin-x-framework-builder
WORKDIR /home/ghost
COPY --from=shade-builder /home/ghost/apps/shade/es apps/shade/es
COPY --from=shade-builder /home/ghost/apps/shade/types apps/shade/types
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/es apps/admin-x-design-system/es
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/types apps/admin-x-design-system/types
RUN cd apps/admin-x-framework && yarn build

# --------------------
# Stats Builder
# --------------------
FROM development-base AS stats-builder
WORKDIR /home/ghost
COPY --from=shade-builder /home/ghost/apps/shade apps/shade
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/es apps/admin-x-design-system/es
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/types apps/admin-x-design-system/types
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/dist apps/admin-x-framework/dist
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/types apps/admin-x-framework/types
RUN cd apps/stats && yarn build

# --------------------
# Posts Builder
# --------------------
FROM development-base AS posts-builder
WORKDIR /home/ghost
COPY --from=shade-builder /home/ghost/apps/shade apps/shade
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/es apps/admin-x-design-system/es
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/types apps/admin-x-design-system/types
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/dist apps/admin-x-framework/dist
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/types apps/admin-x-framework/types
RUN cd apps/posts && yarn build

# --------------------
# Admin-x-settings Builder
# --------------------
FROM development-base AS admin-x-settings-builder
WORKDIR /home/ghost
COPY --from=shade-builder /home/ghost/apps/shade apps/shade
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system apps/admin-x-design-system
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/dist apps/admin-x-framework/dist
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/types apps/admin-x-framework/types
RUN cd apps/admin-x-settings && yarn build

# --------------------
# Admin-x-activitypub Builder
# --------------------
FROM development-base AS admin-x-activitypub-builder
WORKDIR /home/ghost
COPY ghost/core/core/frontend/src/cards ghost/core/core/frontend/src/cards
COPY --from=shade-builder /home/ghost/apps/shade apps/shade
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/es apps/admin-x-design-system/es
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/types apps/admin-x-design-system/types
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/dist apps/admin-x-framework/dist
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/types apps/admin-x-framework/types
RUN cd apps/admin-x-activitypub && yarn build

# --------------------
# Admin Ember Builder
# --------------------
FROM development-base AS admin-ember-builder
WORKDIR /home/ghost
COPY --from=stats-builder /home/ghost/apps/stats/dist apps/stats/dist
COPY --from=posts-builder /home/ghost/apps/posts/dist apps/posts/dist
COPY --from=admin-x-settings-builder /home/ghost/apps/admin-x-settings/dist apps/admin-x-settings/dist
COPY --from=admin-x-activitypub-builder /home/ghost/apps/admin-x-activitypub/dist apps/admin-x-activitypub/dist
RUN mkdir -p ghost/core/core/built/admin && cd ghost/admin && yarn build

# --------------------
# Ghost Assets Builder
# --------------------
FROM development-base AS ghost-assets-builder
WORKDIR /home/ghost
RUN cd ghost/core && yarn build:assets

# --------------------
# Development Stage
# --------------------
FROM development-base AS development
COPY . .
COPY --from=ghost-assets-builder /home/ghost/ghost/core/core/frontend/public ghost/core/core/frontend/public
COPY --from=shade-builder /home/ghost/apps/shade/es apps/shade/es
COPY --from=shade-builder /home/ghost/apps/shade/types apps/shade/types
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/es apps/admin-x-design-system/es
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/types apps/admin-x-design-system/types
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/dist apps/admin-x-framework/dist
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/types apps/admin-x-framework/types
COPY --from=stats-builder /home/ghost/apps/stats/dist apps/stats/dist
COPY --from=posts-builder /home/ghost/apps/posts/dist apps/posts/dist
COPY --from=admin-x-settings-builder /home/ghost/apps/admin-x-settings/dist apps/admin-x-settings/dist
COPY --from=admin-x-activitypub-builder /home/ghost/apps/admin-x-activitypub/dist apps/admin-x-activitypub/dist
COPY --from=admin-ember-builder /home/ghost/ghost/admin/dist ghost/admin/dist
COPY --from=admin-ember-builder /home/ghost/ghost/core/core/built/admin ghost/core/core/built/admin
CMD ["yarn", "dev"]

# --------------------
# Production Stage
# --------------------
FROM development AS production
WORKDIR /home/ghost
ENV NODE_ENV=production
EXPOSE 2368
CMD ["yarn", "start"]

