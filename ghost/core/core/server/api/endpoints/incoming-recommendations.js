const recommendations = require('../../services/recommendations');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
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

module.exports = controller;
