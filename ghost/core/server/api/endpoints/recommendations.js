const recommendations = require('../../services/recommendations').default;

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
    async query(frame) {
      return await recommendations.service.controller.browse(frame);
    },
  },

  read: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['id'],
    permissions: true,
    validation: {},
    async query(frame) {
      return await recommendations.service.controller.read(frame);
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
    async query(frame) {
      return await recommendations.service.controller.add(frame);
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
    async query(frame) {
      return await recommendations.service.controller.check(frame);
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
    async query(frame) {
      return await recommendations.service.controller.edit(frame);
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
    query(frame) {
      return recommendations.service.controller.destroy(frame);
    },
  },
};

module.exports = controller;
