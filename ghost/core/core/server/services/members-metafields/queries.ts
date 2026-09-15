import type { Knex } from 'knex';
import { readableLevels, type Audience } from './access';
import { FIELD_STATUS } from './schema';

const FIELDS_TABLE = 'members_metafields';

// Nothing in the database keeps an archived or hidden field out of a read: no
// constraint stops a value row referencing one. Both filters are therefore applied in
// code, and a query that forgets either is a silent bug.

export function readableBy<T extends Knex.QueryBuilder>(query: T, audience: Audience): T {
  query.whereIn(`${FIELDS_TABLE}.member_access`, readableLevels(audience));
  return query;
}

/**
 * Whether a read includes definitions the publisher has archived.
 *
 * A member is never offered an archived field. Staff managing the list are always
 * shown one, since an archived field is still theirs to rename, restore or delete.
 */
export const ACTIVE_ONLY = 'active-only';
export const ANY_STATUS = 'any-status';
export type StatusScope = typeof ACTIVE_ONLY | typeof ANY_STATUS;

declare const scoped: unique symbol;

// Unannotated so the builder keeps the row type knex derives from the table
// registration; naming a type here would both lose that and make the alias below
// refer to itself.
function metafieldsTable(db: Knex) {
  return db(FIELDS_TABLE);
}

/**
 * A query built by `definitions()`, carrying both filters.
 *
 * knex's builder methods return an unbranded type, so chaining anything onto one of
 * these drops the mark and it stops satisfying this type. Narrow by passing what you
 * need to `definitions()` instead.
 */
export type DefinitionQuery = ReturnType<typeof metafieldsTable> & { readonly [scoped]: true };

export function definitions(
  db: Knex,
  scope: {
    audience: Audience;
    status: StatusScope;
    key?: string;
    /** A publisher's NQL filter, applied under the two filters below rather than over them. */
    filter?: (query: Knex.QueryBuilder) => Knex.QueryBuilder;
    limit?: number;
  },
): DefinitionQuery {
  let query = metafieldsTable(db);

  if (scope.filter) {
    query = scope.filter(query);
  }
  if (scope.key !== undefined) {
    query = query.where(`${FIELDS_TABLE}.key`, scope.key);
  }
  if (scope.status === ACTIVE_ONLY) {
    query = query.where(`${FIELDS_TABLE}.status`, FIELD_STATUS.active);
  }
  if (scope.limit !== undefined) {
    query = query.limit(scope.limit);
  }

  return readableBy(query, scope.audience) as DefinitionQuery;
}

/**
 * The publisher's order, applied to every read of the list. Here for the same reason the
 * status filter is: a read that forgets it comes back in whatever order the engine chose.
 *
 * `created_at` orders a site that has never reordered, where every row still holds the
 * default rank; `id` settles the rest so the order is total.
 */
export function inFieldOrder<T extends Knex.QueryBuilder>(query: T): T {
  query
    .orderBy(`${FIELDS_TABLE}.sort_order`, 'asc')
    .orderBy(`${FIELDS_TABLE}.created_at`, 'asc')
    .orderBy(`${FIELDS_TABLE}.id`, 'asc');
  return query;
}
