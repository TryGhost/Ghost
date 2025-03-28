const publicConfig = require('../../services/public-config');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
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

module.exports = controller;
