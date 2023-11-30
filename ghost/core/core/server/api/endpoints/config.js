const publicConfig = require('../../services/public-config');

module.exports = {
    docName: 'config',

    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        query() {
            return publicConfig.config;
        }
    }
};
