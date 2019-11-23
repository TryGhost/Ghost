### Get certain node image
FROM ubuntu:18.04
MAINTAINER Ghost

# Use bash for the shell
SHELL ["bash", "-c"]

## Squash domain
ARG squash_domain="localhost"
ENV SQUASH_DOMAIN=$squash_domain

## Default password
ARG usr_password="$2b$10$H3T/cnjaCIgBHwUiMMPlzuMxNFVUrAMdv67CM5S.DEPsF8RF2mWsW"
ENV USR_PASSWORD=$usr_password

## Default user
ARG usr_email="ghost@example.com"
ENV USR_EMAIL=$usr_email

## Update package lists
RUN apt-get update -y

## Init && Install dependent packages
RUN apt-get upgrade -y
RUN apt-get install curl git sqlite -y

RUN curl -sL https://deb.nodesource.com/setup_10.x | bash
RUN apt-get install -y nodejs
RUN apt-get install gcc g++ make -y
RUN curl -sL https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
RUN echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
RUN apt-get update
RUN apt-get install yarn -y

## Then install these global packages
RUN yarn global add knex-migrator grunt-cli ember-cli bower

## configure your own reposities
RUN mkdir -p /var/lib/ghost
WORKDIR /var/lib/ghost/

# Manual grunt init: pull private repo Admin client and themes/casper.
RUN mkdir -p content/themes && \
		cd content/themes && \
		git clone https://github.com/TryGhost/Casper.git casper

COPY . /var/lib/ghost/
WORKDIR /var/lib/ghost/

RUN cd core && \
		git clone https://github.com/TryGhost/Ghost-Admin.git client


## Turn localhost to Squash domain.
RUN sed -i "s/http:\/\/localhost:2368/https:\/\/$SQUASH_DOMAIN/g" "core/server/config/env/config.development.json"

RUN sed -i "s/http:\/\/localhost:2368/http:\/\/0.0.0.0:2368/g" "core/server/config/defaults.json"

RUN sed -i "s/127.0.0.1/0.0.0.0/g" "core/server/config/defaults.json"

RUN yarn setup

RUN sqlite3 /var/lib/ghost/content/data/ghost-dev.db "update users set status='active', password='$USR_PASSWORD', email='$USR_EMAIL' where id='1'"

EXPOSE 2368

CMD grunt dev
