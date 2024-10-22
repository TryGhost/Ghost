ARG NODE_VERSION=20.15.1
## Base Image used for all images
FROM node:$NODE_VERSION-bullseye-slim AS base
RUN apt-get update && \
    apt-get install -y \
        build-essential \
        curl \
        jq \
        libjemalloc2 \
        python3 \
        tar \
        git


# Dev Container Stage: configure environment for development, but don't install dependencies yet
FROM base AS devcontainer
# Install Stripe CLI, zsh, playwright
RUN curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | tee /usr/share/keyrings/stripe.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | tee -a /etc/apt/sources.list.d/stripe.list && \
    apt update && \
    apt install -y \
        stripe \
        zsh \
        default-mysql-client && \
    sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" && \
    sed -i 's/plugins=(git)/plugins=(git yarn stripe)/' ~/.zshrc && \
    npx -y playwright@1.46.1 install --with-deps

WORKDIR /home/ghost

# Enable NX daemon to speed up builds
ENV NX_DAEMON=true
ENV YARN_CACHE_FOLDER=/home/ghost/.yarncache

COPY ../ .

# Delete all node_modules folders then install dependencies
RUN find . -name "node_modules" -type d -prune -exec rm -rf '{}' + && \
    yarn install --frozen-lockfile --prefer-offline --cache-folder $YARN_CACHE_FOLDER && \
    cp -r .yarncache .yarncachecopy && \
    rm -Rf .yarncachecopy/.tmp && \
    yarn cache clean

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

ENTRYPOINT ["./docker/entry.sh"]

# Development Stage: full development build with all dependencies installed
FROM devcontainer AS development

# Install node dependencies
WORKDIR /home/ghost
CMD ["yarn", "dev"]
