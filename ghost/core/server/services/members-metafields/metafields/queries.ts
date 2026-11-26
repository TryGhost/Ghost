import type { Knex } from 'knex';
import untypedNql from '@tryghost/nql';
import knexify from '@tryghost/mongo-knex';
import { z } from 'zod';
import type { Identity, Key, Namespace } from '@tryghost/metafield-types/identity';
import schema from '../../../data/schema/schema';
import type { Asking } from './callers';
import { accessOf } from './models';
import type { Namespaces, RecordOf } from './namespaces';
import type { MetafieldResource } from './resource';
import { DbFieldAccess, FIELD_STATUS, type FieldsTable, type MetafieldRow } from './schema';

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

/** The fields a caller may read, by namespace, as the policies decided. */
export type ReadableFields = ReadonlyMap<Namespace, readonly Key[]>;

/**
 * Narrows a read of the fields to the ones named in `readable`, which the policies decided. A
 * namespace with none of them is left out whole.
 */
function readableBy<T extends Knex.QueryBuilder>(
  query: T,
  fieldsName: string,
  readable: ReadableFields,
): T {
  query.where((anyField) => {
    // An empty `IN` matches nothing, for a caller who can read no field at all.
    anyField.whereIn(`${fieldsName}.namespace`, []);
    for (const [namespace, keys] of readable) {
      anyField.orWhere((inNamespace) =>
        inNamespace.where(`${fieldsName}.namespace`, namespace).whereIn(`${fieldsName}.key`, keys),
      );
    }
  });
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

function storedFields(db: Knex, resource: MetafieldResource) {
  return db<FieldsTable>(resource.tables.fields);
}

// Typed with the row itself rather than the table's composite type: a read goes on to read from
// the fields as the source reads them, a subquery that type doesn't describe.
function metafieldsTable(db: Knex, resource: MetafieldResource) {
  return db<MetafieldRow>(resource.tables.fields);
}

/**
 * A read of the fields built by `definitions()`, scoped to the caller and statuses it was asked
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
export interface DefinitionScope {
  caller: Asking;
  /**
   * The record the read is for, which decides whether a member is its member. Without one, it is
   * a question about definitions, answered as for the member's own record.
   */
  record?: RecordOf;
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
  /**
   * The name the fields are read under: their table's, so a column is qualified the same way
   * whether a read names the table or the fields as this reads them.
   */
  name: string;
  /**
   * The fields `caller` may read on `record`. Every field's own policy is read and laid over its
   * namespace's, so the policies decide, in code, before any read of the fields is narrowed.
   */
  readableFields(db: Knex, caller: Asking, record: RecordOf): Promise<ReadableFields>;
  /** Narrows a read that joins the fields to the ones `readableFields` gave. */
  readable<T extends Knex.QueryBuilder>(query: T, readable: ReadableFields): T;
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
  definitions(db: Knex, scope: DefinitionScope): Promise<DefinitionQuery>;
  /**
   * The fields `keys` name in `namespace`, held against change until `trx` ends. The lock is
   * taken in the same statement as the read, on the rows as stored.
   */
  locked(trx: Knex.Transaction, namespace: Namespace, keys: readonly Key[]): Knex.QueryBuilder;
}

/** How long a field's name and key can be, as the schema defines the columns they are kept in. */
const FieldColumnLengths = z.object({
  name: z.object({ maxlength: z.number() }),
  key: z.object({ maxlength: z.number() }),
});

/**
 * The fields as a site reads them: as stored, except that a field in a namespace that isn't
 * available reads as archived. Which namespaces aren't is asked on every read, as it can change
 * while Ghost runs.
 */
export function fieldSource(
  resource: MetafieldResource,
  namespaces: Pick<Namespaces, 'unavailable' | 'canRead'>,
): FieldSource {
  const tableName = resource.tables.fields;
  // The canonical schema, which the migrations and models also read, so these can't drift from
  // the database.
  const columns = FieldColumnLengths.parse(schema[tableName]);
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
    name: tableName,

    maxLength: { name: columns.name.maxlength, key: columns.key.maxlength },

    async readableFields(db, caller, record) {
      // Every field, whatever its status, as a policy says nothing about status. There are only
      // ever a few per namespace, as many as its limit lets it hold.
      const rows = await db(tableName).select('namespace', 'key', 'member_access');
      const readable = new Map<Namespace, Key[]>();
      for (const row of rows) {
        // A row that can't be read as a field is left out, as every read of fields leaves it out.
        const field = DbFieldAccess.safeParse(row);
        if (!field.success) {
          continue;
        }
        const { namespace, key } = field.data;
        const access = accessOf(field.data.member_access);
        if (namespaces.canRead(caller, { namespace, access }, record)) {
          readable.set(namespace, [...(readable.get(namespace) ?? []), key]);
        }
      }
      return readable;
    },

    readable(query, readable) {
      return readableBy(query, tableName, readable);
    },

    table(db) {
      return storedFields(db, resource);
    },

    asRead(db, alias = tableName) {
      return asRead(db, db(tableName)).as(alias);
    },

    async definitions(db, scope) {
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

      const readable = await source.readableFields(db, scope.caller, scope.record ?? null);
      return new ScopedDefinitions(source.readable(query, readable));
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
