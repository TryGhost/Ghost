import type { Knex } from 'knex';
import {
  CUSTOM_NAMESPACE,
  type Identity,
  type Namespace,
} from '@tryghost/metafield-types/identity';
import { readableLevels, type Audience } from './access';
import { FIELD_STATUS, type MetafieldRow } from './schema';

/** The fields table's name, which is also the name `fieldsTable` reads it under by default. */
export const FIELDS_TABLE = 'members_metafields';

/**
 * The columns a field is read with, besides the status a plan can override. Every column of
 * the row is named, so a column added to it doesn't compile until it is added here too.
 */
const COLUMNS_BESIDE_STATUS = Object.keys({
  id: true,
  namespace: true,
  key: true,
  name: true,
  type: true,
  member_access: true,
  sort_order: true,
  created_at: true,
  updated_at: true,
} satisfies Record<Exclude<keyof MetafieldRow, 'status'>, true>);

// The same NQL -> knex bridge Bookshelf's filter plugin uses, applied directly to our
// raw-knex queries: nql parses a `filter` string to a Mongo query, mongo-knex turns that
// into parametrised WHERE clauses. Neither needs a Bookshelf model. Typed once here, since
// neither package ships types.
export const nql = require('@tryghost/nql') as (filter: string) => { toJSON(): object };
export const knexify = require('@tryghost/mongo-knex') as <T extends Knex.QueryBuilder>(
  qb: T,
  mongoQuery: object,
  config: { tableName: string },
) => T;

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

/** What the site's plan includes, as far as reading fields goes. */
export interface Plan {
  includesCustomFields: boolean;
}

/**
 * The fields table as the site's plan lets it be read, under the name a query gives it.
 *
 * Every read that asks what a field is, or whether it can take a value, names the table
 * through this rather than directly, here or in another domain, so the plan holds for
 * every one of them. That includes the check before writing a value, which is how such a
 * plan refuses one. Only changes to the field list read the table as stored, since the
 * plan refuses those before they run.
 *
 * A plan without custom fields makes each of the publisher's fields read as archived,
 * whatever status it holds, so whatever already happens to an archived field happens to
 * every one of them. Nothing is stored, so each comes back as it was, archived or not,
 * once the plan includes them again.
 */
export function fieldsTable(
  db: Knex,
  plan: Plan,
  alias: string = FIELDS_TABLE,
): Knex.TableDescriptor {
  if (plan.includesCustomFields) {
    return alias === FIELDS_TABLE ? FIELDS_TABLE : `${FIELDS_TABLE} as ${alias}`;
  }
  return db(FIELDS_TABLE)
    .select(
      ...COLUMNS_BESIDE_STATUS,
      db.raw('CASE WHEN ?? = ? THEN ? ELSE ?? END AS ??', [
        'namespace',
        CUSTOM_NAMESPACE,
        FIELD_STATUS.archived,
        'status',
        'status',
      ]),
    )
    .as(alias);
}

// Typed with the row itself rather than the table registration: the query goes on to read
// from whatever `fieldsTable` hands back, which can be a subquery the registration doesn't
// describe.
function metafieldsTable(db: Knex) {
  return db<MetafieldRow>(FIELDS_TABLE);
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
    plan: Plan;
    /** One namespace's fields. Without it, every namespace's. */
    namespace?: Namespace;
    /** One field. A key alone names none: each namespace has its own. */
    field?: FieldIdentity;
    /** A publisher's NQL filter, applied under the two filters below rather than over them. */
    filter?: (query: Knex.QueryBuilder) => Knex.QueryBuilder;
    limit?: number;
  },
): DefinitionQuery {
  let query = metafieldsTable(db);

  // Applied while the query still reads the table by its name, then pointed at the table as
  // the plan lets it be read: the NQL bridge qualifies every column with whatever the query
  // reads from, and a plan without custom fields makes that a subquery.
  if (scope.filter) {
    query = scope.filter(query);
  }
  query = query.from<MetafieldRow>(fieldsTable(db, scope.plan));
  if (scope.namespace !== undefined) {
    query = query.where(`${FIELDS_TABLE}.namespace`, scope.namespace);
  }
  if (scope.field !== undefined) {
    query = query
      .where(`${FIELDS_TABLE}.namespace`, scope.field.namespace)
      .where(`${FIELDS_TABLE}.key`, scope.field.key);
  }
  if (scope.status === ACTIVE_ONLY) {
    query = query.where(`${FIELDS_TABLE}.status`, FIELD_STATUS.active);
  }
  if (scope.limit !== undefined) {
    query = query.limit(scope.limit);
  }

  return readableBy(query, scope.audience) as DefinitionQuery;
}

/** A whole field's identity, which is what anything outside the fields table points at. */
export type FieldIdentity = Pick<Identity, 'namespace' | 'key'>;

/** The columns a row that points at a field holds it in: namespace and key together. */
export function fieldReference(field: FieldIdentity) {
  return { metafield_namespace: field.namespace, metafield_key: field.key };
}

/**
 * Joins a row that points at a field to that field. On namespace and key together, since
 * a key alone names a field in every namespace that has one.
 */
export function onField(fieldsAlias: string, pointingTable: string) {
  return function (this: Knex.JoinClause) {
    this.on(`${fieldsAlias}.namespace`, `${pointingTable}.metafield_namespace`).andOn(
      `${fieldsAlias}.key`,
      `${pointingTable}.metafield_key`,
    );
  };
}

/**
 * The publisher's order, applied to every read of the list. Here for the same reason the
 * status filter is: a read that forgets it comes back in whatever order the engine chose.
 *
 * Each namespace is its own list with its own ranks, so a read across several keeps each
 * one together. `created_at` orders a site that has never reordered, where every row still
 * holds the default rank; `id` settles the rest so the order is total.
 */
export function inFieldOrder<T extends Knex.QueryBuilder>(query: T): T {
  query
    .orderBy(`${FIELDS_TABLE}.namespace`, 'asc')
    .orderBy(`${FIELDS_TABLE}.sort_order`, 'asc')
    .orderBy(`${FIELDS_TABLE}.created_at`, 'asc')
    .orderBy(`${FIELDS_TABLE}.id`, 'asc');
  return query;
}
