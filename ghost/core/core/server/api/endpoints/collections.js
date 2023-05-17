const collectionsService = require('../../services/collections');

module.exports = {
    docName: 'collections',

    browse: {
        options: [
            'limit',
            'order',
            'page'
        ],
        // @NOTE: should have permissions when moving out of Alpha
        permissions: false,
        query(frame) {
            return collectionsService.api.browse(frame.options);
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: true
        },
        // @NOTE: should have permissions when moving out of Alpha
        permissions: false,
        async query(frame) {
            return await collectionsService.api.add(frame.data.collections[0], frame.options);
        }
    }
};
