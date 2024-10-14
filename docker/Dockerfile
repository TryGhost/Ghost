ARG NODE_VERSION=20.15.1
FROM node:$NODE_VERSION-bullseye

WORKDIR /home/ghost

ENV YARN_CACHE_FOLDER=/home/ghost/.yarncache

COPY ../ .
RUN yarn install --frozen-lockfile --cache-folder $YARN_CACHE_FOLDER && \
    cp -r .yarncache .yarncachecopy && \
    rm -Rf .yarncachecopy/.tmp && \
    yarn cache clean

ENV NX_DAEMON=true

EXPOSE 2368
EXPOSE 4200

ENTRYPOINT ["./docker/entry.sh"]
CMD ["yarn", "dev"]
