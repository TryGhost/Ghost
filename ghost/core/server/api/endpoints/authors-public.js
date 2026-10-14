const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const pick = require('lodash/pick');
const models = require('../../models');
const { rejectAuthorsContentApiRestrictedFieldsTransformer } = require('./utils/api-filter-utils');

const ALLOWED_INCLUDES = ['count.posts'];
const ALLOWED_READ_FIELDS = ['id', 'slug'];

const messages = {
  notFound: 'Author not found.',
  missingIdentifier: 'An author id or slug is required.',
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'authors',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['include', 'filter', 'fields', 'limit', 'order', 'page'],
    validation: {
      options: {
        include: {
          values: ALLOWED_INCLUDES,
        },
      },
    },
    permissions: true,
    query(frame) {
      const options = {
        ...frame.options,
        mongoTransformer: rejectAuthorsContentApiRestrictedFieldsTransformer,
      };
      return models.Author.findPage(options);
    },
  },

  read: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['include', 'filter', 'fields'],
    data: ALLOWED_READ_FIELDS,
    validation: {
      options: {
        include: {
          values: ALLOWED_INCLUDES,
        },
      },
    },
    permissions: true,
    async query(frame) {
      // GET bodies bypass the framework's declared data fields. Restrict the
      // actual lookup too, before the model turns it into SQL predicates.
      const data = pick(frame.data, ALLOWED_READ_FIELDS);
      if (!Object.values(data).some(Boolean)) {
        throw new errors.BadRequestError({ message: tpl(messages.missingIdentifier) });
      }

      const options = {
        ...frame.options,
        mongoTransformer: rejectAuthorsContentApiRestrictedFieldsTransformer,
      };

      const model = await models.Author.findOne(data, options);
      if (!model) {
        throw new errors.NotFoundError({
          message: tpl(messages.notFound),
        });
      }

      return model;
    },
  },
};

module.exports = controller;
