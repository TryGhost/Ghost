const exploreService = require('../../services/explore');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'explore',

    read: {
        headers: {
            cacheInvalidate: false
        },
        permissions: true,
        query() {
            return exploreService.fetchData();
        }
    }
};

module.exports = controller;
