FROM node:18.18.2

WORKDIR /app

COPY package.json ./
COPY yarn.lock ./

COPY . .

# Install node-gyp globally
RUN npm install -g node-gyp

RUN yarn install

RUN npm rebuild

EXPOSE 2368

CMD ["yarn", "dev"]
