import errors from '@tryghost/errors';
import { parse } from '@tryghost/nql-lang';
import { errify } from '../../../shared/errify';

/**
 * A filter as NQL parses it: a Mongo-style query object such as `{status: 'paid'}` or
 * `{$and: [{status: 'paid'}, {'labels.slug': 'vip'}]}`.
 */
export type ParsedFilter = Readonly<Record<string, unknown>>;

/** Whether `value` is a parsed filter: an object, rather than a list or a single value. */
export function isParsedFilter(value: unknown): value is ParsedFilter {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * The error a filter fails with when it can't be read or turned into a query: the same message the
 * filter plugin reports for every other model, keeping the cause's context and help.
 */
export function unreadableFilter(cause: unknown): errors.BadRequestError {
  return new errors.BadRequestError({
    message: 'Error parsing filter',
    err: errify(cause),
  });
}

/**
 * Parses filter text into the filter it describes, exactly as written: no condition is merged,
 * combined or renamed. Throws `unreadableFilter` when the text doesn't parse.
 */
export function parseFilter(text: string): ParsedFilter {
  try {
    return parse(text);
  } catch (err) {
    throw unreadableFilter(err);
  }
}
