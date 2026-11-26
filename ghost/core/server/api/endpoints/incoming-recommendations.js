/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'recommendations',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['limit', 'page'],
    permissions: true,
    validation: {},
    async query(frame, site) {
      const {
        incomingRecommendationController,
      } = require('../../../../domains/network/http/incoming-recommendation.controller');
      return await incomingRecommendationController(site).browse(frame);
    },
  },
};

module.exports = controller;
