ARG NODE_VERSION=20.15.1
FROM node:$NODE_VERSION-bullseye

WORKDIR /home/ghost

COPY ../ .
RUN yarn

ENV NX_DAEMON=true

EXPOSE 2368
EXPOSE 4200

CMD ["yarn", "dev"]