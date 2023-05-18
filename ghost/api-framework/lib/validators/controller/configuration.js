const errors = require('@tryghost/errors');

module.exports = {
    headers(apiImpl) {
        const headers = apiImpl.headers;

        if (headers?.cacheInvalidate === undefined) {
            return Promise.reject(new errors.IncorrectUsageError());
        }
    }
};
