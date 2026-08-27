import errors from '@tryghost/errors';
import { getUsedKeys, rejectStatements } from '@tryghost/mongo-utils';

const CONTENT_API_RESTRICTED_FIELDS = new Set(['password', 'email']);

const ADMIN_API_RESTRICTED_FIELDS = new Set(['password']);

function hasRestrictedSegment(key: string, fields: Set<string>): boolean {
  return key
    .toLowerCase()
    .split('.')
    .some((segment) => fields.has(segment));
}

export const rejectContentApiRestrictedFieldsTransformer = (input: unknown) => {
  return rejectStatements(input, (key: string) =>
    hasRestrictedSegment(key, CONTENT_API_RESTRICTED_FIELDS),
  );
};

export const rejectAdminApiRestrictedFieldsTransformer = (input: unknown) => {
  return rejectStatements(input, (key: string) =>
    hasRestrictedSegment(key, ADMIN_API_RESTRICTED_FIELDS),
  );
};

export const validateAdminApiBulkFilterTransformer = (input: unknown) => {
  const restrictedField = getUsedKeys(input).find((key: string) =>
    hasRestrictedSegment(key, ADMIN_API_RESTRICTED_FIELDS),
  );

  if (restrictedField) {
    throw new errors.BadRequestError({
      message: 'Restricted fields cannot be used in bulk operation filters.',
    });
  }

  return input;
};
