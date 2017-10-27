FROM node:8.8-alpine

# work directory.
ENV WORKDIR=/var/www/ghost

WORKDIR ${WORKDIR}


ADD ./package.json

