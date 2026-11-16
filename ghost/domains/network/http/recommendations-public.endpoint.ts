import type { Controller } from '@tryghost/api-framework';
import recommendations from '../services/recommendations';

const controller: Controller = {
  docName: 'recommendations',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['limit', 'order', 'page', 'filter'],
    permissions: true,
    validation: {},
    async query(frame) {
      return await recommendations.service.controller.browse(frame);
    },
  },

  trackClicked: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['id'],
    validation: {
      options: {
        id: {
          required: true,
        },
      },
    },
    permissions: true,
    statusCode: 204,
    async query(frame) {
      await recommendations.service.controller.trackClicked(frame);
    },
  },

  trackSubscribed: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['id'],
    validation: {
      options: {
        id: {
          required: true,
        },
      },
    },
    permissions: true,
    statusCode: 204,
    async query(frame) {
      await recommendations.service.controller.trackSubscribed(frame);
    },
  },
};

export default controller;
