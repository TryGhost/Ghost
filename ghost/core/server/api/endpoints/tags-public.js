const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const pick = require('lodash/pick');
const models = require('../../models');
const tagsPublicService = require('../../services/tags-public');
const { rejectTagsContentApiRestrictedFieldsTransformer } = require('./utils/api-filter-utils');

const ALLOWED_INCLUDES = ['count.posts'];
const ALLOWED_READ_FIELDS = ['id', 'slug', 'visibility'];

const messages = {
  tagNotFound: 'Tag not found.',
  missingIdentifier: 'A tag id or slug is required.',
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'tags',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    cache: tagsPublicService.api?.cache,
    options: ['include', 'filter', 'fields', 'limit', 'order', 'page', 'debug'],
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
        mongoTransformer: rejectTagsContentApiRestrictedFieldsTransformer,
      };
      return models.TagPublic.findPage(options);
    },
  },

  read: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['include', 'filter', 'fields', 'debug'],
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
      // GET bodies bypass the framework's declared data fields. Preserve the
      // public visibility constraint, but require an actual tag identifier.
      const data = pick(frame.data, ALLOWED_READ_FIELDS);
      if (![data.id, data.slug].some(Boolean)) {
        throw new errors.BadRequestError({ message: tpl(messages.missingIdentifier) });
      }

      const options = {
        ...frame.options,
        mongoTransformer: rejectTagsContentApiRestrictedFieldsTransformer,
      };
      const model = await models.TagPublic.findOne(data, options);
      if (!model) {
        throw new errors.NotFoundError({
          message: tpl(messages.tagNotFound),
        });
      }

      return model;
    },
  },
};

module.exports = controller;
