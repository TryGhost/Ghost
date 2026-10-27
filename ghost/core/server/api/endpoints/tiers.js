const tiersService = require('../../services/tiers');

// `requirements` is not a relation of a tier. It is allowed here only so callers can ask for
// what each tier's members must give; the input serializer reads it as whether to list them.
const includes = { include: { values: ['requirements'] } };

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'tiers',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['limit', 'fields', 'filter', 'order', 'debug', 'page', 'include'],
    validation: { options: includes },
    permissions: {
      docName: 'products',
    },
    async query(frame) {
      const page = await tiersService.api.browse(frame.options);
      return page;
    },
  },

  read: {
    headers: {
      cacheInvalidate: false,
    },
    data: ['id'],
    options: ['include'],
    validation: { options: includes },
    permissions: {
      docName: 'products',
    },
    async query(frame) {
      return await tiersService.api.read(frame.data.id, {
        withRequirements: frame.options.withRequirements,
      });
    },
  },

  add: {
    statusCode: 201,
    headers: {
      cacheInvalidate: true,
    },
    options: ['include'],
    validation: {
      data: {
        name: { required: true },
      },
      options: includes,
    },
    permissions: {
      docName: 'products',
    },
    async query(frame) {
      // A requirement on every paid tier covers a new tier straight away.
      return await tiersService.api.add(frame.data, {
        withRequirements: frame.options.withRequirements,
      });
    },
  },

  edit: {
    statusCode: 200,
    options: ['id', 'include'],
    headers: {
      cacheInvalidate: true,
    },
    validation: {
      options: {
        id: {
          required: true,
        },
        ...includes,
      },
    },
    permissions: {
      docName: 'products',
    },
    async query(frame) {
      return await tiersService.api.edit(frame.options.id, frame.data, {
        withRequirements: frame.options.withRequirements,
      });
    },
  },
};

module.exports = controller;
