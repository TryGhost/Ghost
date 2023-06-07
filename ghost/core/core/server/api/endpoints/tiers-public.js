const tiersService = require('../../services/tiers');

module.exports = {
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
