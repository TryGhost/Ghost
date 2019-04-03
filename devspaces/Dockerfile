FROM phusion/baseimage:0.11

LABEL \
    "com.trilogy.product"="Ghost" \
    "com.trilogy.company"="External" \
    "com.trilogy.stage"="dev" \
    "com.trilogy.maintainer.skype"="otaviocx" \
    "com.trilogy.maintainer.email"="otaviocalaca.xavier@aurea.com" \
    "description"="This file generates a docker image containing NodeJS and Yarn to build and run Ghost project"

ADD assets /opt

ENV NODE_OPTIONS=--max_old_space_size=8192 \
    NODE_ENV=devspaces

RUN chmod +x /opt/*.sh && \
    # install git, nodejs, npm and yarn
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get update && \
    curl -sL https://deb.nodesource.com/setup_8.x | bash - && \
    apt-get install -y git nodejs yarn && \
    curl -L https://www.npmjs.com/install.sh | sh && \
    apt-get clean all && \
    # Install needed tools using yarn
    yarn global add knex-migrator grunt-cli ember-cli bower && \
    yarn cache clean

WORKDIR /data
