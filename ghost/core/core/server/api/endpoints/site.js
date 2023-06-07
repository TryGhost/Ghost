const publicConfig = require('../../services/public-config');

const site = {
    docName: 'site',

    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: false,
        query() {
            return publicConfig.site;
        }
    }
};

module.exports = site;
