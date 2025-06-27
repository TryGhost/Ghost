const getTinybirdService = require('../../services/tinybird');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'tinybird',

    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: {
            docName: 'members',
            method: 'browse'
        },
        async query() {
            const tinybirdService = getTinybirdService();
            const token = tinybirdService ? tinybirdService.getToken() : null;
            return {token};
        }
    }
};

module.exports = controller;
