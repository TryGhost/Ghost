FROM node:14-buster-slim

# add "bash" for "[["
RUN apt-get update && apt-get install -y bash git python

RUN yarn global add grunt grunt-cli

ENV NODE_ENV development

COPY ./package.json /srv/ghost/package.json
COPY ./yarn.lock /srv/ghost/yarn.lock

WORKDIR /srv/ghost
RUN yarn install --silent && yarn cache clean

COPY . /srv/ghost

RUN grunt build
RUN grunt prod

ENV NODE_ENV production

EXPOSE 2368
CMD ["node", "./index.js"]
