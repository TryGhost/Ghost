const tiersService = require('../../services/tiers');

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'tiers',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['limit', 'fields', 'filter', 'order', 'debug', 'page', 'include'],
    // `requirements` is not a relation of a tier. It is allowed here only so callers can ask
    // for what each tier's members must give; the input serializer reads it as whether to list
    // them.
    validation: { options: { include: { values: ['requirements'] } } },
    permissions: true,
    async query(frame) {
      const page = await tiersService.api.browse(frame.options);

      return page;
    },
  },
};

module.exports = controller;
