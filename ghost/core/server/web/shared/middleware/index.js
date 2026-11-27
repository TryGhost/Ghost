module.exports = {
  get api() {
    return require('./api');
  },

  get cacheControl() {
    return require('./cache-control').cacheControl;
  },

  get maxLimitCap() {
    return require('./max-limit-cap');
  },

  get prettyUrls() {
    return require('./pretty-urls');
  },

  get rateLimiting() {
    return require('./rate-limiting');
  },

  get urlRedirects() {
    return require('./url-redirects');
  },
};
