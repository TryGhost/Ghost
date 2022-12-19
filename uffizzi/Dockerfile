FROM node:16
ENV NODE_ENV=development

WORKDIR /app

COPY . .

RUN yarn global add knex-migrator ember-cli
RUN yarn setup

RUN chmod +x /app/uffizzi/docker-entrypoint.sh

ENTRYPOINT ["/app/uffizzi/docker-entrypoint.sh"]

EXPOSE 2368
