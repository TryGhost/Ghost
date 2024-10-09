ARG NODE_VERSION=20.15.1
FROM node:$NODE_VERSION-bullseye

WORKDIR /home/ghost

COPY docker-local-entrypoint.sh .

ENV NX_DAEMON=true

EXPOSE 2368
EXPOSE 4200

ENTRYPOINT ["./docker-local-entrypoint.sh"]
CMD ["node", ".github/scripts/dev.js"]
