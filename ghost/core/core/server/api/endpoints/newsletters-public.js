const models = require('../../models');
const {
  rejectNewslettersContentApiRestrictedFieldsTransformer,
  rejectNewslettersContentApiRestrictedOrderFields,
} = require('./utils/api-filter-utils');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'newsletters',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['filter', 'fields', 'limit', 'order', 'page'],
    permissions: true,
    query(frame) {
      const options = {
        ...frame.options,
        order: rejectNewslettersContentApiRestrictedOrderFields(frame.options.order),
        mongoTransformer: rejectNewslettersContentApiRestrictedFieldsTransformer,
      };
      return models.Newsletter.findPage(options);
    },
  },
};

module.exports = controller;
