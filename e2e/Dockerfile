# E2E Testing Dockerfile - assets served via Ghost's /content/files/
# Assumes `yarn build` was run on host before building this image
FROM node:22-bullseye-slim

WORKDIR /home/ghost

# Install curl for health checks
RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*

# Copy package files and install dependencies
COPY package.json yarn.lock ./
COPY ghost/core/package.json ghost/core/package.json
COPY ghost/i18n/package.json ghost/i18n/package.json
COPY ghost/parse-email-address/package.json ghost/parse-email-address/package.json
RUN yarn install --frozen-lockfile

# Copy Ghost core and dependencies
COPY ghost/core ghost/core
COPY ghost/i18n ghost/i18n
COPY ghost/parse-email-address ghost/parse-email-address

# Copy built public apps to content/files (Ghost serves these natively)
COPY apps/portal/umd ghost/core/content/files/portal
COPY apps/comments-ui/umd ghost/core/content/files/comments-ui
COPY apps/sodo-search/umd ghost/core/content/files/sodo-search
COPY apps/signup-form/umd ghost/core/content/files/signup-form
COPY apps/announcement-bar/umd ghost/core/content/files/announcement-bar

# Load Tinybird/Stripe config from shared-config (if available)
COPY docker/ghost-dev/entrypoint.sh /home/ghost/entrypoint.sh
RUN chmod +x /home/ghost/entrypoint.sh

# Set environment variables for local asset URLs
ENV portal__url=/content/files/portal/portal.min.js
ENV comments__url=/content/files/comments-ui/comments-ui.min.js
ENV sodoSearch__url=/content/files/sodo-search/sodo-search.min.js
ENV sodoSearch__styles=/content/files/sodo-search/main.css
ENV signupForm__url=/content/files/signup-form/signup-form.min.js
ENV announcementBar__url=/content/files/announcement-bar/announcement-bar.min.js

WORKDIR /home/ghost/ghost/core
EXPOSE 2368

ENTRYPOINT ["/home/ghost/entrypoint.sh"]
CMD ["node", "--import=tsx", "index.js"]
