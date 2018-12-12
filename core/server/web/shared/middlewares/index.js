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

    get adminRedirects() {
        return require('./admin-redirects');
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

    get frontendClient() {
        return require('./frontend-client');
    },

    get ghostLocals() {
        return require('./ghost-locals');
    },

    get labs() {
        return require('./labs');
    },

    get logRequest() {
        return require('./log-request');
    },

    get maintenance() {
        return require('./maintenance');
    },

    get prettyUrls() {
        return require('./pretty-urls');
    },

    get serveFavicon() {
        return require('./serve-favicon');
    },

    get servePublicFile() {
        return require('./serve-public-file');
    },

    get staticTheme() {
        return require('./static-theme');
    },

    get uncapitalise() {
        return require('./uncapitalise');
    },

    get urlRedirects() {
        return require('./url-redirects');
    },

    get updateUserLastSeen() {
        return require('./update-user-last-seen');
    },

    get emitEvents() {
        return require('./emit-events');
    }
};
