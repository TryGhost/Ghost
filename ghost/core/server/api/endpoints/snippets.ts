import type { Controller, Frame } from '@tryghost/api-framework';

type BodyFrame = Frame<{ data: { snippets: Record<string, unknown>[] } }>;
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const models = require('../../models');
const { restrictAdminApiQueryOptions } = require('./utils/api-filter-utils');

const messages = {
  snippetNotFound: 'Snippet not found.',
  snippetAlreadyExists: 'Snippet already exists.',
};

const controller: Controller = {
  docName: 'snippets',

  browse: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['limit', 'order', 'page', 'formats', 'filter'],
    permissions: true,
    validation: {
      options: {
        formats: {
          values: models.Snippet.allowedFormats,
        },
      },
    },
    query(frame) {
      return models.Snippet.findPage(restrictAdminApiQueryOptions(frame.options));
    },
  },

  read: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['formats'],
    data: ['id'],
    permissions: true,
    async query(frame) {
      const model = await models.Snippet.findOne(frame.data, frame.options);
      if (!model) {
        throw new errors.NotFoundError({
          message: tpl(messages.snippetNotFound),
        });
      }

      return model;
    },
  },

  add: {
    statusCode: 201,
    headers: {
      cacheInvalidate: false,
    },
    options: ['formats'],
    permissions: true,
    query(frame: BodyFrame) {
      return models.Snippet.add(frame.data.snippets[0], frame.options).catch(
        (error: { code?: string; message: string }) => {
          if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
            throw new errors.ValidationError({ message: tpl(messages.snippetAlreadyExists) });
          }

          throw error;
        },
      );
    },
  },

  edit: {
    headers: {
      cacheInvalidate: false,
    },
    options: ['id', 'formats'],
    validation: {
      options: {
        id: {
          required: true,
        },
      },
    },
    permissions: true,
    async query(frame: BodyFrame) {
      const model = await models.Snippet.edit(frame.data.snippets[0], frame.options);
      if (!model) {
        throw new errors.NotFoundError({
          message: tpl(messages.snippetNotFound),
        });
      }

      return model;
    },
  },

  destroy: {
    statusCode: 204,
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
    query(frame) {
      return models.Snippet.destroy({ ...frame.options, require: true });
    },
  },
};

module.exports = controller;
