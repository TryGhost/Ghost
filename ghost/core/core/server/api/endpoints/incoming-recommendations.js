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
            'filter',
            'order'
        ],
        permissions: true,
        validation: {},
        async query() {
            return await recommendations.incomingRecommendationController.browse();
        }
    }
};
