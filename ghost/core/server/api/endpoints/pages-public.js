const tpl = require('@tryghost/tpl');
const errors = require('@tryghost/errors');
const pick = require('lodash/pick');
const models = require('../../models');
const { rejectPagesContentApiRestrictedFieldsTransformer } = require('./utils/api-filter-utils');
const { generateGiftKeyData, applyGiftAccess } = require('./utils/gift-link-access');
const { generateOptionsData, generateAuthData } = require('./utils/public-cache-keys');

const ALLOWED_INCLUDES = ['tags', 'authors', 'tiers'];
const ALLOWED_READ_FIELDS = ['id', 'slug', 'uuid'];

const messages = {
  pageNotFound: 'Page not found.',
  missingIdentifier: 'A page id, slug or uuid is required.',
};

/** @type {import('@tryghost/api-framework').Controller} */
const controller = {
  docName: 'pages',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: [
      'include',
      'filter',
      'fields',
      'formats',
      'absolute_urls',
      'page',
      'limit',
      'order',
      'debug',
    ],
    validation: {
      options: {
        include: {
          values: ALLOWED_INCLUDES,
        },
        formats: {
          values: models.Post.allowedFormats,
        },
      },
    },
    permissions: true,
    query(frame) {
      const options = {
        ...frame.options,
        mongoTransformer: rejectPagesContentApiRestrictedFieldsTransformer,
      };
      return models.Post.findPage(options);
    },
  },

  read: {
    headers: {
      cacheInvalidate: false,
    },
    // The pages read has no response cache today, but the key must stay
    // paired with applyGiftAccess below: if a cache is ever added without
    // the gift dimension, a gift read would populate the anonymous key
    // with unlocked content.
    async generateCacheKeyData(frame) {
      return {
        options: generateOptionsData(frame, ['include', 'fields', 'formats', 'absolute_urls']),
        auth: generateAuthData(frame),
        gift: await generateGiftKeyData(frame),
        method: 'read',
        identifier: {
          id: frame.data.id,
          slug: frame.data.slug,
          uuid: frame.data.uuid,
        },
      };
    },
    options: ['include', 'fields', 'formats', 'debug', 'absolute_urls'],
    data: ALLOWED_READ_FIELDS,
    validation: {
      options: {
        include: {
          values: ALLOWED_INCLUDES,
        },
        formats: {
          values: models.Post.allowedFormats,
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
        mongoTransformer: rejectPagesContentApiRestrictedFieldsTransformer,
      };
      const model = await models.Post.findOne(data, options);
      if (!model) {
        throw new errors.NotFoundError({
          message: tpl(messages.pageNotFound),
        });
      }

      await applyGiftAccess(frame, model);

      return model;
    },
  },
};

module.exports = controller;
