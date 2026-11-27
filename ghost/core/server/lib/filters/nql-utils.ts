import { findStatement } from '@tryghost/mongo-utils';
import groupBy from 'lodash/groupBy';
import isPlainObjectValue from 'lodash/isPlainObject';
import mapValues from 'lodash/mapValues';

// Two rewrites `@tryghost/nql` applies to every parsed filter before compiling it. Each behaves
// as the function of the same name in `@tryghost/nql` does, except where its docstring says.

type Node = Record<string, unknown>;

function isPlainObject(value: unknown): value is Node {
  return isPlainObjectValue(value);
}

function isList(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** A `$ne` value SQL can compare in an `IN` list. */
type ComparableValue = string | number | boolean;

/**
 * The key and value of `filter` when it is a single `$ne` statement on one key with a value SQL
 * can compare in an `IN` list, such as `{a: {$ne: 1}}`, and undefined for anything else.
 */
function combinableNe(filter: unknown): { key: string; value: ComparableValue } | undefined {
  if (!isPlainObject(filter)) {
    return undefined;
  }
  const keys = Object.keys(filter);
  if (keys.length !== 1) {
    return undefined;
  }
  const statement = filter[keys[0]];
  if (!isPlainObject(statement) || Object.keys(statement).length !== 1) {
    return undefined;
  }
  const value = statement.$ne;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return { key: keys[0], value };
  }
  return undefined;
}

/**
 * Combines several `$ne` statements on one key within an `$and` into one `$nin` statement, as
 * `@tryghost/nql`'s combineNeFilters does: `{$and: [{a: {$ne: 1}}, {a: {$ne: 2}}]}` becomes
 * `{a: {$nin: [1, 2]}}`, which compiles to one subquery for a relation key instead of one per
 * value. Nested `$and` groups are combined too. Changes `mongoJSON` in place and returns it.
 *
 * Unlike `@tryghost/nql`'s, it combines only statements that are a single `$ne` with a string,
 * number or boolean, and leaves every other statement where it is. A `$ne: null` stays its own
 * statement because SQL's `IN` never matches NULL: `{a: {$nin: [null, 'x']}}` compiles to
 * `a NOT IN (NULL, 'x')`, which no row satisfies, and on a relation key it no longer leaves out the
 * members with no related row. A statement with another operator beside its `$ne`, or another key
 * beside it in the same object, keeps that condition instead of losing it to the combined `$nin`,
 * and a key `mongoJSON` already has a statement on keeps it.
 */
export function combineNeFilters(mongoJSON: Node): Node {
  const andFilters = mongoJSON.$and;
  // Early return if there is no '$and' or no '$ne' filters to process
  if (!isList(andFilters) || !findStatement(mongoJSON, '$ne')) {
    return mongoJSON;
  }

  // The single `$ne` statements in the `$and` that can be combined, grouped by their key
  const combinable = andFilters.flatMap((filter) => {
    const ne = combinableNe(filter);
    return ne ? [{ filter, ...ne }] : [];
  });
  const byKey = groupBy(combinable, ({ key }) => key);

  for (const [key, statements] of Object.entries(byKey)) {
    if (statements.length < 2 || Object.hasOwn(mongoJSON, key)) {
      continue;
    }
    // Replace the combined statements with a single '$nin'
    mongoJSON[key] = { $nin: statements.map(({ value }) => value) };
    for (const { filter } of statements) {
      andFilters.splice(andFilters.indexOf(filter), 1);
    }
  }

  // Clean up the '$and' filter if it's empty after processing
  if (andFilters.length === 0) {
    delete mongoJSON.$and;
  }

  // Recursively process nested '$and' filters
  const remaining = mongoJSON.$and;
  if (isList(remaining)) {
    mongoJSON.$and = remaining.map((filter) =>
      isPlainObject(filter) ? combineNeFilters(filter) : filter,
    );
  }

  return mongoJSON;
}

const isOp = (key: string) => key.charAt(0) === '$';

/**
 * Expands the `$all` operator into an `$and` of equality statements on each key `expands`
 * accepts, as `@tryghost/nql`'s expandAllFilters does on every key: `field:[a+b]` parses to
 * `{field: {$all: [a, b]}}` and becomes `{$and: [{field: a}, {field: b}]}`, which mongo-knex turns
 * into one subquery per value for a many-to-many relation. Returns a new filter and leaves
 * `filter` as it is.
 */
export function expandAllFilters(filter: Node, expands: (key: string) => boolean): Node {
  const keys = Object.keys(filter);

  // CASE: a lone `{field: {$all: [...]}}` becomes `{$and: [{field: a}, ...]}`
  if (keys.length === 1) {
    const key = keys[0];
    const value = filter[key];

    if (
      !isOp(key) &&
      expands(key) &&
      isPlainObject(value) &&
      Object.keys(value).length === 1 &&
      isList(value.$all)
    ) {
      return { $and: value.$all.map((item) => ({ [key]: item })) };
    }
  }

  // Otherwise recurse so nested `$all` (e.g. inside `$and`/`$or`) is expanded too
  return mapValues(filter, (value) => expandAllIn(value, expands));
}

/** `value` with the `$all` of each filter it holds expanded, as expandAllFilters expands it. */
function expandAllIn(value: unknown, expands: (key: string) => boolean): unknown {
  if (isList(value)) {
    return value.map((child) => expandAllIn(child, expands));
  }
  if (!isPlainObject(value)) {
    return value;
  }
  return expandAllFilters(value, expands);
}
