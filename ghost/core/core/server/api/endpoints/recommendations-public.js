const recommendations = require('../../services/recommendations');

module.exports = {
    docName: 'recommendations',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'limit',
            'order',
            'page',
            'filter'
        ],
        permissions: true,
        validation: {},
        async query(frame) {
            return await recommendations.controller.browse(frame);
        }
    },

    trackClicked: {
        headers: {
            cacheInvalidate: false
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
        statusCode: 204,
        async query(frame) {
            await recommendations.controller.trackClicked(frame);
        }
    },

    trackSubscribed: {
        headers: {
            cacheInvalidate: false
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
        statusCode: 204,
        async query(frame) {
            await recommendations.controller.trackSubscribed(frame);
        }
    }
};
