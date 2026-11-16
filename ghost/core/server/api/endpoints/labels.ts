import { defineController, defineMethod } from '@tryghost/api-framework';
import { labels } from '@tryghost/api-contracts/admin';
import errors from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import { restrictAdminApiQueryOptions } from './utils/api-filter-utils';
import { assertBodyIdMatches } from './utils/assert-body-id';

const models = require('../../models');

const messages = {
  labelNotFound: 'Label not found.',
  labelAlreadyExists: 'Label already exists',
};

// SQLITE_CONSTRAINT covers more than unique violations, but schema validation
// rejects null/oversize names before the database, so only the unique
// constraint on name/slug can reach this catch
const isUniqueConstraintViolation = (error: { code?: string }) => {
  return error.code === 'ER_DUP_ENTRY' || error.code === 'SQLITE_CONSTRAINT';
};

const handleDuplicateNameError = (error: { code?: string }) => {
  if (isUniqueConstraintViolation(error)) {
    throw new errors.ValidationError({ message: tpl(messages.labelAlreadyExists) });
  }

  throw error;
};

// The serializer turns `include` into `withRelated`; give it the filtered list.
const useParsedInclude = (frame: {
  options: Record<string, unknown>;
  validated: { readonly options: { include?: string[] } };
}) => {
  if (frame.validated.options.include) {
    frame.options.include = frame.validated.options.include;
  }
};

const browse = defineMethod({
  schema: labels.browse,
  headers: {
    cacheInvalidate: false,
  },
  options: ['include', 'filter', 'fields', 'limit', 'order', 'page'],
  validation: useParsedInclude,
  permissions: true,
  query(frame) {
    return models.Label.findPage(restrictAdminApiQueryOptions(frame.options));
  },
});

const read = defineMethod({
  schema: labels.read,
  headers: {
    cacheInvalidate: false,
  },
  options: ['include', 'filter', 'fields'],
  validation: useParsedInclude,
  permissions: true,
  async query(frame) {
    const { id, slug } = frame.validated.options;
    const model = await models.Label.findOne(
      id ? { id } : { slug },
      restrictAdminApiQueryOptions(frame.options),
    );
    if (!model) {
      throw new errors.NotFoundError({
        message: tpl(messages.labelNotFound),
      });
    }

    return model;
  },
});

const add = defineMethod({
  schema: labels.add,
  statusCode: 201,
  headers: {
    cacheInvalidate: false,
  },
  options: ['include'],
  validation: useParsedInclude,
  permissions: true,
  query(frame) {
    return models.Label.add(frame.validated.body, frame.options).catch(handleDuplicateNameError);
  },
});

const edit = defineMethod({
  schema: labels.edit,
  headers: {
    cacheInvalidate: false,
  },
  options: ['id', 'include'],
  validation(frame) {
    assertBodyIdMatches(frame.original.body, 'labels', frame.validated.options.id);
    useParsedInclude(frame);
  },
  permissions: true,
  async query(frame) {
    const model = await models.Label.edit(frame.validated.body, frame.options).catch(
      handleDuplicateNameError,
    );

    if (!model) {
      throw new errors.NotFoundError({
        message: tpl(messages.labelNotFound),
      });
    }

    if (model.wasChanged()) {
      frame.setHeader('X-Cache-Invalidate', '/*');
    }

    return model;
  },
});

const destroy = defineMethod({
  schema: labels.destroy,
  statusCode: 204,
  headers: {
    cacheInvalidate: true,
  },
  options: ['id'],
  permissions: true,
  query(frame) {
    return models.Label.destroy({ ...frame.options, require: true });
  },
});

const controller = defineController({
  docName: 'labels',
  browse,
  read,
  add,
  edit,
  destroy,
});

export default controller;
