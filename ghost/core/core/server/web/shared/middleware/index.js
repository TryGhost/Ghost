module.exports = {
    get api() {
        return require('./api');
    },

    get brute() {
        return require('./brute');
    },

    get cacheControl() {
        return require('@tryghost/mw-cache-control');
    },

    get prettyUrls() {
        return require('./pretty-urls');
    },

    get urlRedirects() {
        return require('./url-redirects');
    }
};
