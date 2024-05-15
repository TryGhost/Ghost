const tiersService = require('../../services/tiers');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
    docName: 'tiers',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'limit',
            'fields',
            'filter',
            'order',
            'debug',
            'page'
        ],
        permissions: true,
        async query(frame) {
            const page = await tiersService.api.browse(frame.options);

            return page;
        }
    }
};

module.exports = controller;
