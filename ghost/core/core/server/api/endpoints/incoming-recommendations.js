const recommendations = require('../../services/recommendations');

module.exports = {
    docName: 'recommendations',

    browse: {
        headers: {
            cacheInvalidate: false
        },
        options: [
            'limit',
            'page'
        ],
        permissions: true,
        validation: {},
        async query(frame) {
            return await recommendations.incomingRecommendationController.browse(frame);
        }
    }
};
