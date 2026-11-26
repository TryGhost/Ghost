/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'recommendations',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['limit', 'page', 'include', 'filter', 'order'],
    permissions: true,
    validation: {},
    async query(frame, site) {
      const {
        recommendationController,
      } = require('../../../../domains/network/http/recommendation.controller');
      return await recommendationController(site).browse(frame);
    },
  },

  read: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['id'],
    permissions: true,
    validation: {},
    async query(frame, site) {
      const {
        recommendationController,
      } = require('../../../../domains/network/http/recommendation.controller');
      return await recommendationController(site).read(frame);
    },
  },

  add: {
    statusCode: 201,
    headers: {
      cacheInvalidate: true,
    },
    options: [],
    validation: {},
    permissions: true,
    async query(frame, site) {
      const {
        recommendationController,
      } = require('../../../../domains/network/http/recommendation.controller');
      return await recommendationController(site).add(frame);
    },
  },

  /**
   * Fetch metadata for a recommendation URL
   */
  check: {
    headers: {
      cacheInvalidate: true,
    },
    options: [],
    validation: {},
    permissions: {
      // Everyone who has add permissions, can 'check'
      method: 'add',
    },
    async query(frame, site) {
      const {
        recommendationController,
      } = require('../../../../domains/network/http/recommendation.controller');
      return await recommendationController(site).check(frame);
    },
  },

  edit: {
    headers: {
      cacheInvalidate: true,
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
    async query(frame, site) {
      const {
        recommendationController,
      } = require('../../../../domains/network/http/recommendation.controller');
      return await recommendationController(site).edit(frame);
    },
  },

  destroy: {
    statusCode: 204,
    headers: {
      cacheInvalidate: true,
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
    query(frame, site) {
      const {
        recommendationController,
      } = require('../../../../domains/network/http/recommendation.controller');
      return recommendationController(site).destroy(frame);
    },
  },
};

module.exports = controller;
