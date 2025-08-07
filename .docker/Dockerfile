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
    git && \
    rm -rf /var/lib/apt/lists/* && \
    apt clean

# --------------------
# Playwright Version
# --------------------
# Cache Optimization: Extract the playwright version from package.json
FROM base AS playwright-version
WORKDIR /tmp
COPY ghost/core/package.json ./
RUN jq -r '.devDependencies."@playwright/test"' ./package.json > playwright-version.txt

# --------------------
# Playwright
# --------------------
# Cache Optimization: Playwright install is slow. Copy the version from the previous stage.
# This way we only bust build cache when the playwright version changes.
FROM base AS playwright
RUN curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | tee /usr/share/keyrings/stripe.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | tee -a /etc/apt/sources.list.d/stripe.list && \
    apt update && \
    apt install -y \
    stripe && \
    rm -rf /var/lib/apt/lists/* && \
    apt clean
WORKDIR /home/ghost
COPY --from=playwright-version tmp/playwright-version.txt /tmp/playwright-version.txt
RUN npx playwright@$(cat /tmp/playwright-version.txt) install --with-deps

# --------------------
# Development Base
# --------------------
FROM playwright AS development-base
WORKDIR /home/ghost

COPY package.json yarn.lock ./

# Calculate a hash of the yarn.lock file
## See development.entrypoint.sh for more info
RUN mkdir -p .yarnhash && md5sum yarn.lock | awk '{print $1}' > .yarnhash/yarn.lock.md5

# Copy all package.json files
COPY apps/stats/package.json apps/stats/package.json
COPY apps/admin-x-activitypub/package.json apps/admin-x-activitypub/package.json
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
COPY ghost/admin/lib/asset-delivery/package.json ghost/admin/lib/asset-delivery/package.json
COPY ghost/admin/lib/ember-power-calendar-moment/package.json ghost/admin/lib/ember-power-calendar-moment/package.json
COPY ghost/admin/lib/ember-power-calendar-utils/package.json ghost/admin/lib/ember-power-calendar-utils/package.json
COPY ghost/admin/package.json ghost/admin/package.json
COPY ghost/core/package.json ghost/core/package.json
COPY ghost/i18n/package.json ghost/i18n/package.json

# Copy patches directory so patch-package can apply patches during yarn install
COPY patches patches

RUN yarn install --frozen-lockfile --prefer-offline

# --------------------
# Development
# --------------------
FROM development-base AS development
COPY . .
RUN yarn build
CMD ["yarn", "dev"]