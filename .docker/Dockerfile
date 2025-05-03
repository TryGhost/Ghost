ARG NODE_VERSION=20.15.1

FROM node:$NODE_VERSION-bullseye-slim AS base
RUN apt-get update && \
    apt-get install -y \
    build-essential \
    curl \
    jq \
    libjemalloc2 \
    python3 \
    tar && \
    rm -rf /var/lib/apt/lists/* && \
    apt clean

FROM base AS development-base
WORKDIR /home/ghost
RUN curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | tee /usr/share/keyrings/stripe.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | tee -a /etc/apt/sources.list.d/stripe.list && \
    apt update && \
    apt install -y \
    git \
    stripe \
    procps && \
    rm -rf /var/lib/apt/lists/* && \
    apt clean


FROM development-base AS development
WORKDIR /home/ghost

## Add github to known hosts
### Without this, git submodule updates fail inside the container
RUN mkdir -p /root/.ssh && \
    ssh-keyscan github.com >> /root/.ssh/known_hosts

# Enable the NX Daemon
ENV NX_DAEMON=true

# Disable NX rejection of unknown local cache
ENV NX_REJECT_UNKNOWN_LOCAL_CACHE=false

# Copy the package.json and yarn.lock files
COPY package.json yarn.lock ./

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
COPY ghost/api-framework/package.json ghost/api-framework/package.json
COPY ghost/core/package.json ghost/core/package.json
COPY ghost/custom-fonts/package.json ghost/custom-fonts/package.json
COPY ghost/domain-events/package.json ghost/domain-events/package.json
COPY ghost/email-addresses/package.json ghost/email-addresses/package.json
COPY ghost/email-service/package.json ghost/email-service/package.json
COPY ghost/html-to-plaintext/package.json ghost/html-to-plaintext/package.json
COPY ghost/i18n/package.json ghost/i18n/package.json
COPY ghost/job-manager/package.json ghost/job-manager/package.json
COPY ghost/members-csv/package.json ghost/members-csv/package.json
COPY ghost/mw-error-handler/package.json ghost/mw-error-handler/package.json
COPY ghost/mw-vhost/package.json ghost/mw-vhost/package.json
COPY ghost/prometheus-metrics/package.json ghost/prometheus-metrics/package.json
COPY ghost/security/package.json ghost/security/package.json

## Install dependencies
RUN yarn install --frozen-lockfile --prefer-offline
COPY . .
RUN yarn nx run-many -t build:ts
CMD ["yarn", "dev"]


FROM development AS tinybird
RUN apt update && apt install -y \
    parallel \
    python3-pip
WORKDIR /home/ghost/ghost/web-analytics
RUN pip install -r requirements.txt


FROM development AS browser-tests
RUN npx -y playwright install --with-deps
CMD ["yarn", "test:browser"]
