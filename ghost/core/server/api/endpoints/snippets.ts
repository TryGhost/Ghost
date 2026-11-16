import { defineController, defineMethod } from '@tryghost/api-framework';
import { snippets } from '@tryghost/api-contracts/admin';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import { restrictAdminApiQueryOptions } from './utils/api-filter-utils';
import { assertBodyIdMatches } from './utils/assert-body-id';

const models = require('../../models');

const messages = {
  snippetNotFound: 'Snippet not found.',
  snippetAlreadyExists: 'Snippet already exists.',
};

const browse = defineMethod({
  schema: snippets.browse,
  headers: {
    cacheInvalidate: false,
  },
  options: ['limit', 'order', 'page', 'formats', 'filter'],
  permissions: true,
  query(frame) {
    return models.Snippet.findPage(restrictAdminApiQueryOptions(frame.options));
  },
});

const read = defineMethod({
  schema: snippets.read,
  headers: {
    cacheInvalidate: false,
  },
  options: ['formats'],
  permissions: true,
  async query(frame) {
    const model = await models.Snippet.findOne({ id: frame.validated.options.id }, frame.options);
    if (!model) {
      throw new errors.NotFoundError({
        message: tpl(messages.snippetNotFound),
      });
    }

    return model;
  },
});

const add = defineMethod({
  schema: snippets.add,
  statusCode: 201,
  headers: {
    cacheInvalidate: false,
  },
  options: ['formats'],
  permissions: true,
  query(frame) {
    return models.Snippet.add(frame.validated.body, frame.options).catch(
      (error: { code?: string; message: string }) => {
        if (error.code && error.message.toLowerCase().indexOf('unique') !== -1) {
          throw new errors.ValidationError({ message: tpl(messages.snippetAlreadyExists) });
        }

        throw error;
      },
    );
  },
});

const edit = defineMethod({
  schema: snippets.edit,
  headers: {
    cacheInvalidate: false,
  },
  options: ['id', 'formats'],
  validation(frame) {
    assertBodyIdMatches(frame.original.body, 'snippets', frame.validated.options.id);
  },
  permissions: true,
  async query(frame) {
    const model = await models.Snippet.edit(frame.validated.body, frame.options);
    if (!model) {
      throw new errors.NotFoundError({
        message: tpl(messages.snippetNotFound),
      });
    }

    return model;
  },
});

const destroy = defineMethod({
  schema: snippets.destroy,
  statusCode: 204,
  headers: {
    cacheInvalidate: false,
  },
  options: ['id'],
  permissions: true,
  query(frame) {
    return models.Snippet.destroy({ ...frame.options, require: true });
  },
});

const controller = defineController({
  docName: 'snippets',
  browse,
  read,
  add,
  edit,
  destroy,
});

export default controller;
