const models = require('../../models');
const { restrictAdminApiQueryOptions } = require('./utils/api-filter-utils');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'actions',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['page', 'limit', 'fields', 'include', 'filter'],
    permissions: true,
    query(frame) {
      return models.Action.findPage(restrictAdminApiQueryOptions(frame.options));
    },
  },
};

module.exports = controller;
