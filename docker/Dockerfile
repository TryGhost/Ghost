ARG NODE_VERSION=20.15.1
FROM node:$NODE_VERSION-bullseye

WORKDIR /home/ghost

ENV NX_DAEMON=true
ENV NX_REJECT_UNKNOWN_LOCAL_CACHE=0

EXPOSE 2368
EXPOSE 4200

ENTRYPOINT ["./docker/docker-local-entrypoint.sh"]
CMD ["yarn", "docker:dev:entry"]
