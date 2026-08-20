module.exports = {
    get api() {
        return require('./api');
    },

    get brute() {
        return require('./brute');
    },

    get cacheControl() {
        return require('./cache-control');
    },

    get maxLimitCap() {
        return require('./max-limit-cap');
    },

    get prettyUrls() {
        return require('./pretty-urls');
    },

    get siteId() {
        return require('./site-id').siteId;
    },

    get urlRedirects() {
        return require('./url-redirects');
    }
};
