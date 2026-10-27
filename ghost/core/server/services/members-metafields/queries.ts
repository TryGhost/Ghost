import type { Knex } from 'knex';
import type { Identity, Key, Namespace } from '@tryghost/metafield-types/identity';
import { readableLevels, type Audience } from './access';
import type { Namespaces } from './namespaces';
import { FIELD_STATUS, type MetafieldRow } from './schema';

/** The fields table's name, which is also the name a `FieldSource` reads it under by default. */
export const FIELDS_TABLE = 'members_metafields';

/**
 * The columns a field is read with, besides its status, which reads as its namespace allows.
 * Every column of the row is named, so a column added to it doesn't compile until it is added
 * here too.
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

// Typed with the row itself rather than the table registration: a read goes on to read from
// the fields as the source reads them, a subquery the registration doesn't describe.
function metafieldsTable(db: Knex) {
  return db<MetafieldRow>(FIELDS_TABLE);
}

/**
 * A query built by a source's `definitions()`, carrying both filters.
 *
 * knex's builder methods return an unbranded type, so chaining anything onto one of
 * these drops the mark and it stops satisfying this type. Narrow by passing what you
 * need to `definitions()` instead.
 */
export type DefinitionQuery = ReturnType<typeof metafieldsTable> & { readonly [scoped]: true };

/** Which fields a definitions read is for. */
export interface DefinitionScope {
  audience: Audience;
  status: StatusScope;
  /** One namespace's fields. Without it, every namespace's. */
  namespace?: Namespace;
  /** One field. A key alone names none: each namespace has its own. */
  field?: FieldIdentity;
  /** A publisher's NQL filter, parsed, applied under the two filters below rather than over them. */
  filter?: object;
  limit?: number;
}

/**
 * The fields table as this site reads it, built once by the domain's wiring.
 *
 * Every read that asks what a field is, or whether it can take a value, goes through this
 * rather than naming the table, here or in another domain, so a rule about how fields read
 * holds for every one of them. That includes the check before writing a value. Writes, and
 * the reads a change to the field list is compared with, name the table itself.
 */
export interface FieldSource {
  /** The fields under `alias`, for a read that joins them. */
  table(db: Knex, alias?: string): Knex.TableDescriptor;
  /** The fields `scope` names, in no particular order. */
  definitions(db: Knex, scope: DefinitionScope): DefinitionQuery;
  /**
   * The fields `keys` name in `namespace`, held against change until `trx` ends. The lock is
   * taken in the same statement as the read, on the rows as stored.
   */
  locked(trx: Knex.Transaction, namespace: Namespace, keys: readonly Key[]): Knex.QueryBuilder;
}

/**
 * The fields as a site reads them: as stored, except that a field in a namespace that isn't
 * available reads as archived. Which namespaces aren't is asked on every read, as it can change
 * while Ghost runs.
 */
export function fieldSource(namespaces: Pick<Namespaces, 'unavailable'>): FieldSource {
  const asRead = (db: Knex, rows: Knex.QueryBuilder) => {
    const unavailable = namespaces.unavailable();
    return rows.select(
      ...COLUMNS_BESIDE_STATUS,
      // An empty list makes no valid `IN`, and with nothing unavailable every status reads as
      // stored anyway.
      unavailable.length === 0
        ? 'status'
        : db.raw('CASE WHEN ?? IN (?) THEN ? ELSE ?? END AS ??', [
            'namespace',
            unavailable,
            FIELD_STATUS.archived,
            'status',
            'status',
          ]),
    );
  };

  const source: FieldSource = {
    table(db, alias = FIELDS_TABLE) {
      return asRead(db, db(FIELDS_TABLE)).as(alias);
    },

    definitions(db, scope) {
      let query = metafieldsTable(db);

      // Applied while the query still reads the table by its name, then pointed at the fields as
      // the source reads them, under the same name: the NQL bridge qualifies every column with
      // whatever the query reads from, and a subquery is no name to qualify one with.
      if (scope.filter) {
        query = knexify(query, scope.filter, { tableName: FIELDS_TABLE });
      }
      query = query.from<MetafieldRow>(source.table(db));
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
    },

    locked(trx, namespace, keys) {
      // Locked inside, as MySQL takes no lock on the rows behind a derived table for a lock asked
      // of the query around it.
      const rows = trx(FIELDS_TABLE).where('namespace', namespace).whereIn('key', keys).forShare();
      return trx.from(asRead(trx, rows).as(FIELDS_TABLE));
    },
  };
  return source;
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
export function onField(fieldsTable: string, pointingTable: string) {
  return function (this: Knex.JoinClause) {
    this.on(`${fieldsTable}.namespace`, `${pointingTable}.metafield_namespace`).andOn(
      `${fieldsTable}.key`,
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
