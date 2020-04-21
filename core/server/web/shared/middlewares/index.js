module.exports = {
    get api() {
        return require('./api');
    },

    get image() {
        return require('./image');
    },

    get validation() {
        return require('./validation');
    },

    get brute() {
        return require('./brute');
    },

    get upload() {
        return require('./upload');
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

    get uncapitalise() {
        return require('./uncapitalise');
    },

    get urlRedirects() {
        return require('./url-redirects');
    },

    get updateUserLastSeen() {
        return require('./update-user-last-seen');
    }
};
