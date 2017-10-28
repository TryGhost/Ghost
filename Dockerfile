
FROM node:8.8-alpine

LABEL author=chenyuan
LABEL host=digitalocean

# working directory.
WORKDIR /var/www/ghost/

# node env
ARG NODE_ENV=production
ENV NODE_ENV=production

# copy files which including dependency info
COPY package.json yarn.lock ./
COPY core/client/package.json core/client/yarn.lock ./core/client/

# Install dependencies.
RUN yarn config set registry https://registry.npm.taobao.org \
    && yarn global add node-gyp \
    && yarn run init \
    && yarn cache clean

# populate PATH
ENV PATH ./node_modules/.bin:$PATH

# copy remaining files
COPY . .

EXPOSE 2368

CMD yarn deploy
