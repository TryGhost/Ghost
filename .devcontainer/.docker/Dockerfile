ARG NODE_VERSION=20.15.1
## Base Image used for all targets
FROM node:$NODE_VERSION-bullseye-slim AS base
RUN apt-get update && \
    apt-get install -y \
        build-essential \
        curl \
        jq \
        libjemalloc2 \
        python3 \
        tar

# DevBase Stage: setup environment for development, but no code or node dependencies yet
FROM base AS devbase
# Install Stripe CLI, zsh, playwright
RUN curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | tee /usr/share/keyrings/stripe.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | tee -a /etc/apt/sources.list.d/stripe.list && \
    apt update && \
    apt install -y \
        git \
        stripe \
        zsh \
        default-mysql-client && \
    npx -y playwright@1.46.1 install --with-deps

ENV NX_DAEMON=true
ENV YARN_CACHE_FOLDER=/home/ghost/.yarncache

EXPOSE 2368
EXPOSE 4200
EXPOSE 4173
EXPOSE 41730
EXPOSE 4175
EXPOSE 4176
EXPOSE 4177
EXPOSE 4178
EXPOSE 6174
EXPOSE 7173
EXPOSE 7174


# DevContainer Stage: Add the code and install dependencies
FROM devbase AS devcontainer
WORKDIR /home/ghost
COPY ../../ .
RUN yarn install --frozen-lockfile --prefer-offline --cache-folder $YARN_CACHE_FOLDER

# Development Stage: alternative entrypoint for development with some caching optimizations
FROM devbase AS development

WORKDIR /home/ghost

RUN yarn install --frozen-lockfile --prefer-offline --cache-folder $YARN_CACHE_FOLDER && \
    cp -r .yarncache .yarncachecopy && \
    rm -Rf .yarncachecopy/.tmp && \
    yarn cache clean

ENTRYPOINT ["./.devcontainer/.docker/development.entrypoint.sh"]
CMD ["yarn", "dev"]
