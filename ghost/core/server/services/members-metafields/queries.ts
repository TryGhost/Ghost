import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import untypedNql from '@tryghost/nql';
import knexify from '@tryghost/mongo-knex';
import type { Identity, Key, Namespace } from '@tryghost/metafield-types/identity';
import type { Grant, Grants, Namespaces } from './namespaces';
import type { MetafieldResource } from './resource';
import { FIELD_STATUS, type FieldsTable, type MetafieldRow } from './schema';

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
  settings: true,
  member_access: true,
  sort_order: true,
  created_at: true,
  updated_at: true,
} satisfies Record<Exclude<keyof MetafieldRow, 'status'>, true>);

// Bookshelf's filter plugin uses the same pair: nql parses a filter string into a Mongo-style
// query, and mongo-knex turns that into WHERE clauses. nql ships no types, so the one call made of
// it is typed here, and what it returns is parsed where it is read.
export const nql: (filter: string) => { toJSON(): unknown } = untypedNql;
export { knexify };

// Nothing in the database keeps an archived or hidden field out of a read: no
// constraint stops a value row referencing one. Both filters are therefore applied in
// code, and a query that forgets either is a silent bug.

/**
 * Narrows a read of the fields to the ones `grants` reach: in each namespace someone owns, by its
 * owner's grant, and in every other namespace by the grant for those.
 */
function readableBy<T extends Knex.QueryBuilder>(query: T, fieldsName: string, grants: Grants): T {
  const namespaceColumn = `${fieldsName}.namespace`;
  const owned = grants.owned.map(({ namespace }) => namespace);
  const reached: Array<(where: Knex.QueryBuilder) => void> = [
    ...grants.owned.map(
      ({ namespace, grant }) =>
        (where: Knex.QueryBuilder) =>
          narrowTo(where.where(namespaceColumn, namespace), fieldsName, grant),
    ),
    (where: Knex.QueryBuilder) =>
      narrowTo(where.whereNotIn(namespaceColumn, owned), fieldsName, grants.unowned),
  ];
  query.where((anyNamespace) => {
    for (const narrow of reached) {
      anyNamespace.orWhere(narrow);
    }
  });
  return query;
}

/** Narrows a read already scoped to some namespaces to the fields `grant` reaches in them. */
function narrowTo(where: Knex.QueryBuilder, fieldsName: string, grant: Grant): void {
  switch (grant.fields) {
    case 'all':
      return;
    case 'none':
      // An empty `IN` matches nothing.
      where.whereIn(`${fieldsName}.namespace`, []);
      return;
    case 'by member access':
      where.whereIn(`${fieldsName}.member_access`, grant.levels);
      return;
    default: {
      const _exhaustive: never = grant;
      throw new errors.InternalServerError({ message: `Unhandled grant: ${_exhaustive}` });
    }
  }
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

function storedFields(db: Knex, resource: MetafieldResource) {
  return db<FieldsTable>(resource.tables.fields);
}

// Typed with the row itself rather than the table's composite type: a read goes on to read from
// the fields as the source reads them, a subquery that type doesn't describe.
function metafieldsTable(db: Knex, resource: MetafieldResource) {
  return db<MetafieldRow>(resource.tables.fields);
}

/**
 * A read of the fields built by `definitions()`, scoped to the audience and statuses it was asked
 * for. The class isn't exported and its query is private, so only `definitions()` can make one, and
 * a query that skipped that scoping can't be passed where this is expected.
 */
class ScopedDefinitions {
  readonly #query: ReturnType<typeof metafieldsTable>;

  constructor(query: ReturnType<typeof metafieldsTable>) {
    this.#query = query;
  }

  get read(): ReturnType<typeof metafieldsTable> {
    return this.#query;
  }
}

export type DefinitionQuery = ScopedDefinitions;

/** Which fields a definitions read is for, and who for. */
export interface DefinitionScope<Audience> {
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
export interface FieldSource<Audience> {
  /**
   * The name the fields are read under: their table's, so a column is qualified the same way
   * whether a read names the table or the fields as this reads them.
   */
  name: string;
  /**
   * Narrows a read that joins the fields to the ones `audience` may read, as each namespace's
   * owner grants them.
   */
  readable<T extends Knex.QueryBuilder>(query: T, audience: Audience): T;
  /** The longest name and key the fields table can store. */
  maxLength: { name: number; key: number };
  /**
   * The fields table as stored, for writing definitions. A read that should apply the rules
   * above uses `asRead` or `definitions` instead.
   */
  table(db: Knex): ReturnType<typeof storedFields>;
  /**
   * The fields with an unavailable namespace's fields shown as archived, under `alias`, for a
   * query that joins them.
   */
  asRead(db: Knex, alias?: string): Knex.TableDescriptor;
  /** The fields `scope` names, in no particular order. */
  definitions(db: Knex, scope: DefinitionScope<Audience>): DefinitionQuery;
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
export function fieldSource<Audience>(
  resource: MetafieldResource,
  namespaces: Pick<Namespaces<Audience>, 'unavailable' | 'readable'>,
): FieldSource<Audience> {
  const tableName = resource.tables.fields;
  // The canonical schema, which the migrations and models also read, so these can't drift from
  // the database.
  const columns = require('../../data/schema').tables[tableName];
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

  const source: FieldSource<Audience> = {
    name: tableName,

    maxLength: { name: columns.name.maxlength, key: columns.key.maxlength },

    readable(query, audience) {
      return readableBy(query, tableName, namespaces.readable(audience));
    },

    table(db) {
      return storedFields(db, resource);
    },

    asRead(db, alias = tableName) {
      return asRead(db, db(tableName)).as(alias);
    },

    definitions(db, scope) {
      let query = metafieldsTable(db, resource);

      // Applied while the query still reads the table by its name, then pointed at the fields as
      // the source reads them, under the same name: the NQL bridge qualifies every column with
      // whatever the query reads from, and a subquery is no name to qualify one with.
      if (scope.filter) {
        query = knexify(query, scope.filter, { tableName });
      }
      query = query.from<MetafieldRow>(source.asRead(db));
      if (scope.namespace !== undefined) {
        query = query.where(`${tableName}.namespace`, scope.namespace);
      }
      if (scope.field !== undefined) {
        query = query
          .where(`${tableName}.namespace`, scope.field.namespace)
          .where(`${tableName}.key`, scope.field.key);
      }
      if (scope.status === ACTIVE_ONLY) {
        query = query.where(`${tableName}.status`, FIELD_STATUS.active);
      }
      if (scope.limit !== undefined) {
        query = query.limit(scope.limit);
      }

      return new ScopedDefinitions(source.readable(query, scope.audience));
    },

    locked(trx, namespace, keys) {
      // Locked inside, as MySQL takes no lock on the rows behind a derived table for a lock asked
      // of the query around it.
      const rows = trx(tableName).where('namespace', namespace).whereIn('key', keys).forShare();
      return trx.from(asRead(trx, rows).as(tableName));
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
export function onField(fieldsName: string, pointingTable: string) {
  return function (this: Knex.JoinClause) {
    this.on(`${fieldsName}.namespace`, `${pointingTable}.metafield_namespace`).andOn(
      `${fieldsName}.key`,
      `${pointingTable}.metafield_key`,
    );
  };
}

/**
 * The publisher's order, applied to every read of the list, whose fields are read under
 * `fieldsName`. Here for the same reason the
 * status filter is: a read that forgets it comes back in whatever order the engine chose.
 *
 * Each namespace is its own list with its own ranks, so a read across several keeps each
 * one together. `created_at` orders a site that has never reordered, where every row still
 * holds the default rank; `id` settles the rest so the order is total.
 */
export function inFieldOrder<T extends Knex.QueryBuilder>(query: T, fieldsName: string): T {
  query
    .orderBy(`${fieldsName}.namespace`, 'asc')
    .orderBy(`${fieldsName}.sort_order`, 'asc')
    .orderBy(`${fieldsName}.created_at`, 'asc')
    .orderBy(`${fieldsName}.id`, 'asc');
  return query;
}
