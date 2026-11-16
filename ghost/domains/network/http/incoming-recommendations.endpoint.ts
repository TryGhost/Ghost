import type { Controller } from '@tryghost/api-framework';
import recommendations from '../services/recommendations';

const controller: Controller = {
  docName: 'recommendations',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['limit', 'page'],
    permissions: true,
    validation: {},
    async query(frame) {
      return await recommendations.service.incomingRecommendationController.browse(frame);
    },
  },
};

export default controller;
