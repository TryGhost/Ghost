const TinybirdServiceWrapper = require('../../services/tinybird');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'tinybird',

    token: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        async query() {
            TinybirdServiceWrapper.init();
            const token = TinybirdServiceWrapper.instance ? TinybirdServiceWrapper.instance.getToken() : null;
            return {token};
        }
    }
};

module.exports = controller;
