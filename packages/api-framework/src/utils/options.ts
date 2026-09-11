import errors from '@tryghost/errors';
import _ from 'lodash';

const { IncorrectUsageError } = errors;

/**
 * @description Helper function to prepare params for internal usages.
 *
 * e.g. "a,B,c" -> ["a", "b", "c"]
 *
 * @param {String} params
 * @return {Array}
 */
export const trimAndLowerCase = (params: unknown = '') => {
  params = params || '';

  if (_.isString(params)) {
    params = params.split(',');
  }

  // If we don't have an array at this point, something is wrong, so we should throw an
  // error to avoid trying to .map over something else
  if (!_.isArray(params)) {
    throw new IncorrectUsageError({
      message: 'Params must be a string or array',
    });
  }

  return params.map((item: unknown) => {
    if (typeof item !== 'string') {
      throw new IncorrectUsageError({ message: 'Params must contain only strings' });
    }
    return item.trim().toLowerCase();
  });
};
