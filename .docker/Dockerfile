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

# Calculate a hash of the yarn.lock file
## See development.entrypoint.sh for more info
RUN mkdir -p .yarnhash && md5sum yarn.lock | awk '{print $1}' > .yarnhash/yarn.lock.md5

# Copy all package.json files
COPY apps/stats/package.json apps/stats/package.json
COPY apps/activitypub/package.json apps/activitypub/package.json
COPY apps/admin-x-design-system/package.json apps/admin-x-design-system/package.json
COPY apps/admin-x-framework/package.json apps/admin-x-framework/package.json
COPY apps/admin-x-settings/package.json apps/admin-x-settings/package.json
COPY apps/announcement-bar/package.json apps/announcement-bar/package.json
COPY apps/comments-ui/package.json apps/comments-ui/package.json
COPY apps/portal/package.json apps/portal/package.json
COPY apps/posts/package.json apps/posts/package.json
COPY apps/shade/package.json apps/shade/package.json
COPY apps/signup-form/package.json apps/signup-form/package.json
COPY apps/sodo-search/package.json apps/sodo-search/package.json
COPY e2e/package.json e2e/package.json
COPY ghost/admin/lib/asset-delivery/package.json ghost/admin/lib/asset-delivery/package.json
COPY ghost/admin/lib/ember-power-calendar-moment/package.json ghost/admin/lib/ember-power-calendar-moment/package.json
COPY ghost/admin/lib/ember-power-calendar-utils/package.json ghost/admin/lib/ember-power-calendar-utils/package.json
COPY ghost/admin/package.json ghost/admin/package.json
COPY ghost/core/package.json ghost/core/package.json
COPY ghost/i18n/package.json ghost/i18n/package.json

# Copy patches directory so patch-package can apply patches during yarn install
COPY patches patches

RUN --mount=type=cache,target=/usr/local/share/.cache/yarn,id=yarn-cache \
    yarn install --frozen-lockfile --prefer-offline

# --------------------
# Shade Builder
# --------------------
FROM development-base AS shade-builder
WORKDIR /home/ghost
COPY apps/shade apps/shade
RUN cd apps/shade && yarn build

# --------------------
# Admin-x-design-system Builder
# --------------------
FROM development-base AS admin-x-design-system-builder
WORKDIR /home/ghost
COPY apps/admin-x-design-system apps/admin-x-design-system
RUN cd apps/admin-x-design-system && yarn build

# --------------------
# Admin-x-framework Builder
# --------------------
FROM development-base AS admin-x-framework-builder
WORKDIR /home/ghost
COPY apps/admin-x-framework apps/admin-x-framework
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
COPY apps/stats apps/stats
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
COPY apps/posts apps/posts
COPY --from=shade-builder /home/ghost/apps/shade apps/shade
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/es apps/admin-x-design-system/es
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/types apps/admin-x-design-system/types
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/dist apps/admin-x-framework/dist
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/types apps/admin-x-framework/types
RUN cd apps/posts && yarn build

# --------------------
# Portal Builder
# --------------------
FROM development-base AS portal-builder
WORKDIR /home/ghost
COPY ghost/i18n ghost/i18n
COPY apps/portal apps/portal
RUN cd apps/portal && yarn build

# --------------------
# Admin-x-settings Builder
# --------------------
FROM development-base AS admin-x-settings-builder
WORKDIR /home/ghost
COPY apps/admin-x-settings apps/admin-x-settings
COPY --from=shade-builder /home/ghost/apps/shade apps/shade
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system apps/admin-x-design-system
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/dist apps/admin-x-framework/dist
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/types apps/admin-x-framework/types
RUN cd apps/admin-x-settings && yarn build

# --------------------
# Activitypub Builder
# --------------------
FROM development-base AS activitypub-builder
WORKDIR /home/ghost
COPY apps/activitypub apps/activitypub
COPY ghost/core/core/frontend/src/cards ghost/core/core/frontend/src/cards
COPY --from=shade-builder /home/ghost/apps/shade apps/shade
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/es apps/admin-x-design-system/es
COPY --from=admin-x-design-system-builder /home/ghost/apps/admin-x-design-system/types apps/admin-x-design-system/types
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/dist apps/admin-x-framework/dist
COPY --from=admin-x-framework-builder /home/ghost/apps/admin-x-framework/types apps/admin-x-framework/types
RUN cd apps/activitypub && yarn build

# --------------------
# Admin Ember Builder
# --------------------
FROM development-base AS admin-ember-builder
WORKDIR /home/ghost
COPY ghost/admin ghost/admin
# Admin's asset-delivery pipeline needs the ghost module to resolve
COPY ghost/core/package.json ghost/core/package.json
COPY ghost/core/index.js ghost/core/index.js
COPY --from=stats-builder /home/ghost/apps/stats/dist apps/stats/dist
COPY --from=posts-builder /home/ghost/apps/posts/dist apps/posts/dist
COPY --from=admin-x-settings-builder /home/ghost/apps/admin-x-settings/dist apps/admin-x-settings/dist
COPY --from=activitypub-builder /home/ghost/apps/activitypub/dist apps/activitypub/dist
RUN mkdir -p ghost/core/core/built/admin && cd ghost/admin && yarn build

# --------------------
# Ghost Assets Builder
# --------------------
FROM development-base AS ghost-assets-builder
WORKDIR /home/ghost
COPY ghost/core ghost/core
RUN cd ghost/core && yarn build:assets

# --------------------
# Development
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
COPY --from=portal-builder /home/ghost/apps/portal/umd apps/portal/umd
COPY --from=admin-x-settings-builder /home/ghost/apps/admin-x-settings/dist apps/admin-x-settings/dist
COPY --from=activitypub-builder /home/ghost/apps/activitypub/dist apps/activitypub/dist
COPY --from=admin-ember-builder /home/ghost/ghost/admin/dist ghost/admin/dist
COPY --from=admin-ember-builder /home/ghost/ghost/core/core/built/admin ghost/core/core/built/admin

CMD ["yarn", "dev"]
