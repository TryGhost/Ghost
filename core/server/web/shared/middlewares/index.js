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

    get customRedirects() {
        return require('./custom-redirects');
    },

    get errorHandler() {
        return require('./error-handler');
    },

    get labs() {
        return require('./labs');
    },

    get maintenance() {
        return require('./maintenance');
    },

    get prettyUrls() {
        return require('./pretty-urls');
    },

    get urlRedirects() {
        return require('./url-redirects');
    }
};
