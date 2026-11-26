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
    async query(frame, site) {
      const {
        recommendationController,
      } = require('../../../../domains/network/http/recommendation.controller');
      return await recommendationController(site).browse(frame);
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
    async query(frame, site) {
      const {
        recommendationController,
      } = require('../../../../domains/network/http/recommendation.controller');
      await recommendationController(site).trackClicked(frame);
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
    async query(frame, site) {
      const {
        recommendationController,
      } = require('../../../../domains/network/http/recommendation.controller');
      await recommendationController(site).trackSubscribed(frame);
    },
  },
};

module.exports = controller;
