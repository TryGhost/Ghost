const recommendations = require('../../services/recommendations').default;

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
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

module.exports = controller;
