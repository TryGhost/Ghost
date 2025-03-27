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
        permissions: {
            docName: 'products'
        },
        async query(frame) {
            const page = await tiersService.api.browse(frame.options);
            return page;
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        data: [
            'id'
        ],
        permissions: {
            docName: 'products'
        },
        async query(frame) {
            return await tiersService.api.read(frame.data.id);
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: true
        },
        validation: {
            data: {
                name: {required: true}
            }
        },
        permissions: {
            docName: 'products'
        },
        async query(frame) {
            return await tiersService.api.add(frame.data);
        }
    },

    edit: {
        statusCode: 200,
        options: [
            'id'
        ],
        headers: {
            cacheInvalidate: true
        },
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: {
            docName: 'products'
        },
        async query(frame) {
            return await tiersService.api.edit(frame.options.id, frame.data);
        }
    }
};

module.exports = controller;
