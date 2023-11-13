const recommendations = require('../../services/recommendations');

module.exports = {
    docName: 'recommendations',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'limit',
            'page',
            'include',
            'filter',
            'order'
        ],
        permissions: true,
        validation: {},
        async query(frame) {
            return await recommendations.controller.browse(frame);
        }
    },

    read: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'id'
        ],
        permissions: true,
        validation: {},
        async query(frame) {
            return await recommendations.controller.read(frame);
        }
    },

    add: {
        statusCode: 201,
        headers: {
            cacheInvalidate: true
        },
        options: [],
        validation: {},
        permissions: true,
        async query(frame) {
            return await recommendations.controller.add(frame);
        }
    },

    /**
     * Fetch metadata for a recommendation URL
     */
    check: {
        headers: {
            cacheInvalidate: true
        },
        options: [],
        validation: {},
        permissions: {
            // Everyone who has add permissions, can 'check'
            method: 'add'
        },
        async query(frame) {
            return await recommendations.controller.check(frame);
        }
    },

    edit: {
        headers: {
            cacheInvalidate: true
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        async query(frame) {
            return await recommendations.controller.edit(frame);
        }
    },

    destroy: {
        statusCode: 204,
        headers: {
            cacheInvalidate: true
        },
        options: [
            'id'
        ],
        validation: {
            options: {
                id: {
                    required: true
                }
            }
        },
        permissions: true,
        query(frame) {
            return recommendations.controller.destroy(frame);
        }
    }
};
