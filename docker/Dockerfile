ARG NODE_VERSION=20.15.1
FROM node:$NODE_VERSION-bullseye AS base

# Install Stripe CLI
RUN curl -s https://packages.stripe.dev/api/security/keypair/stripe-cli-gpg/public | gpg --dearmor | tee /usr/share/keyrings/stripe.gpg && \
    echo "deb [signed-by=/usr/share/keyrings/stripe.gpg] https://packages.stripe.dev/stripe-cli-debian-local stable main" | tee -a /etc/apt/sources.list.d/stripe.list && \
    apt update && \
    apt install stripe -y

WORKDIR /home/ghost

ENV YARN_CACHE_FOLDER=/home/ghost/.yarncache

COPY ../ .
RUN yarn install --frozen-lockfile --perfer-offline --cache-folder $YARN_CACHE_FOLDER && \
    cp -r .yarncache .yarncachecopy && \
    rm -Rf .yarncachecopy/.tmp && \
    yarn cache clean

FROM base AS development
WORKDIR /home/ghost

ENV NX_DAEMON=true

# Ghost
EXPOSE 2368
# Admin Tests
EXPOSE 4200
# Lexical Editor
EXPOSE 4173
EXPOSE 41730
# Portal
EXPOSE 4175
EXPOSE 4176
# Announcement Bar
EXPOSE 4177
# Search
EXPOSE 4178
# Signup form
EXPOSE 6174
# Comments UI
EXPOSE 7173
EXPOSE 7174


ENTRYPOINT ["./docker/entry.sh"]
CMD ["yarn", "dev"]
