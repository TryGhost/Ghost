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
            'page'
        ],
        permissions: true,
        validation: {},
        async query(frame) {
            return await recommendations.controller.listRecommendations(frame);
        }
    }
};
