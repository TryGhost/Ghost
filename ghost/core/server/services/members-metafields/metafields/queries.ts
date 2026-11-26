import type { Knex } from 'knex';
import untypedNql from '@tryghost/nql';
import knexify from '@tryghost/mongo-knex';
import { z } from 'zod';
import { MEMBER_ACCESS } from '@tryghost/metafield-types';
import type { Identity, Key, Namespace } from '@tryghost/metafield-types/identity';
import schema from '../../../data/schema/schema';
import type { Asking } from './callers';
import {
  LEVEL_RANK,
  isRecordsMember,
  possibleSubjects,
  type Namespaces,
  type RecordOf,
} from './namespaces';
import { recordsAreMembers, type MetafieldResource } from './resource';
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
 * The CTEs a read works out the caller's level on each field with. Namespaces are registered in
 * code, so their owners and policies reach the query as bound values; each field's own policy is
 * read from its row. Named for metafields so they can't shadow a table a query also reads.
 */
const CTE = {
  namespaces: 'metafield_namespaces',
  grants: 'metafield_grants',
  subjects: 'metafield_subjects',
  levels: 'metafield_levels',
} as const;

/**
 * A table of bound values with `columns`, one row for each of `rows`, for a CTE. Written out,
 * because knex drops a union from a select that reads no table. With no rows it's still a valid,
 * empty table.
 */
function rowsOf(db: Knex, columns: readonly string[], rows: ReadonlyArray<readonly Knex.Value[]>) {
  if (rows.length === 0) {
    return db.raw(`select ${columns.map(() => 'null as ??').join(', ')} where 1 = 0`, [...columns]);
  }
  const select = `select ${columns.map(() => '? as ??').join(', ')}`;
  return db.raw(
    rows.map(() => select).join(' union all '),
    rows.flatMap((row) => columns.flatMap((column, index) => [row[index], column])),
  );
}

/** The name the caller's level on each field is joined under, for a read to filter or select. */
export const LEVELS = CTE.levels;

/** The level a read needs, as `LEVELS` holds it. */
export const READ_RANK = LEVEL_RANK.read;

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
   * Joins `caller`'s level on each field to a query that reads the fields under `name`, as
   * `LEVELS`, worked out in the same statement: a field's own grant replaces its namespace's for
   * the same subject, and the caller has the highest level of any subject it is. A field in a
   * namespace nobody registered has no level, so the join leaves it out.
   */
  withLevels<T extends Knex.QueryBuilder>(db: Knex, query: T, caller: Asking): T;
  /** The column of `LEVELS` that holds the caller's level on `record`. */
  levelOn(caller: Asking, record: RecordOf): string;
  /**
   * The caller's level on the record each row is about, where a read covers several records: the
   * record's id is in `recordColumn`. Only on a resource whose records are members can it be the
   * caller's own.
   */
  levelOnEach(db: Knex, caller: Asking, recordColumn: string): Knex.Raw;
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
  /** The fields `scope` names that its caller may read, in no particular order. */
  definitions(db: Knex, scope: DefinitionScope): DefinitionQuery;
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
  namespaces: Pick<Namespaces, 'unavailable' | 'policies'>,
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

  /** `metafield_namespaces (namespace, owner)`: every registered namespace. */
  const namespacesCte = (db: Knex) =>
    rowsOf(
      db,
      ['namespace', 'owner'],
      namespaces.policies().map(({ namespace, owner }) => [namespace, owner]),
    );

  /**
   * `metafield_grants (namespace, key, subject, level)`: one row for each level a policy gives a
   * subject. A namespace's own policy has the empty key. Each field's own policy is its stored
   * member level, the one place that column is read, so storing whole policies changes only this.
   */
  const grantsCte = (db: Knex) => {
    const memberLevel = db.raw(
      `case ?? ${Object.values(MEMBER_ACCESS)
        .map(() => 'when ? then ?')
        .join(' ')} end as ??`,
      [
        'member_access',
        ...Object.values(MEMBER_ACCESS).flatMap((access) => [access, LEVEL_RANK[access]]),
        'level',
      ],
    );
    const fieldGrants = db(tableName).select(
      'namespace',
      'key',
      db.raw('? as ??', ['member', 'subject']),
      memberLevel,
    );
    const namespaceGrants = namespaces
      .policies()
      .flatMap(({ namespace, policy }) =>
        Object.entries(policy).map(([subject, level]) => [
          namespace,
          '',
          subject,
          LEVEL_RANK[level],
        ]),
      );
    return namespaceGrants.length > 0
      ? fieldGrants.unionAll(rowsOf(db, ['namespace', 'key', 'subject', 'level'], namespaceGrants))
      : fieldGrants;
  };

  /** `metafield_subjects (subject)`: every subject the caller can be. */
  const subjectsCte = (db: Knex, caller: Asking) =>
    rowsOf(
      db,
      ['subject'],
      possibleSubjects(caller).map((subject) => [subject]),
    );

  /**
   * `metafield_levels (namespace, key, level_on_others, level_on_own)`: the caller's level on each
   * field. `owner` counts only in the namespaces the caller owns. `member` counts only on the
   * member's own record, so there's a level for that and one for every other record.
   */
  const levelsCte = (db: Knex, caller: Asking) => {
    const installation =
      caller.kind === 'app' && 'installationId' in caller ? caller.installationId : null;
    const level = db
      .raw('coalesce(??, ??, 0)', ['field_grant.level', 'namespace_grant.level'])
      .toQuery();
    return db
      .select(
        'f.namespace',
        'f.key',
        db.raw(`max(case when ?? = ? then 0 else ${level} end) as ??`, [
          's.subject',
          'member',
          'level_on_others',
        ]),
        db.raw(`max(${level}) as ??`, ['level_on_own']),
      )
      .from(`${tableName} as f`)
      .join(`${CTE.namespaces} as n`, 'n.namespace', 'f.namespace')
      .join(`${CTE.subjects} as s`, function () {
        this.on(db.raw('?? <> ?', ['s.subject', 'owner'])).orOn(
          db.raw('?? = ?', ['n.owner', installation]),
        );
      })
      .leftJoin(`${CTE.grants} as namespace_grant`, function () {
        this.on('namespace_grant.namespace', 'f.namespace')
          .andOnVal('namespace_grant.key', '')
          .andOn('namespace_grant.subject', 's.subject');
      })
      .leftJoin(`${CTE.grants} as field_grant`, function () {
        this.on('field_grant.namespace', 'f.namespace')
          .andOn('field_grant.key', 'f.key')
          .andOn('field_grant.subject', 's.subject');
      })
      .groupBy('f.namespace', 'f.key');
  };

  const source: FieldSource = {
    name: tableName,

    maxLength: { name: columns.name.maxlength, key: columns.key.maxlength },

    withLevels(db, query, caller) {
      query
        .with(CTE.namespaces, namespacesCte(db))
        .with(CTE.grants, grantsCte(db))
        .with(CTE.subjects, subjectsCte(db, caller))
        .with(CTE.levels, levelsCte(db, caller))
        .join(CTE.levels, function () {
          this.on(`${CTE.levels}.namespace`, `${tableName}.namespace`).andOn(
            `${CTE.levels}.key`,
            `${tableName}.key`,
          );
        });
      return query;
    },

    levelOn(caller, record) {
      return `${CTE.levels}.${isRecordsMember(caller, record) ? 'level_on_own' : 'level_on_others'}`;
    },

    levelOnEach(db, caller, recordColumn) {
      const me =
        recordsAreMembers(resource) && caller.kind === 'member' && 'memberId' in caller
          ? caller.memberId
          : null;
      return db.raw('case when ?? = ? then ?? else ?? end', [
        recordColumn,
        me,
        `${CTE.levels}.level_on_own`,
        `${CTE.levels}.level_on_others`,
      ]);
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
      query = source.withLevels(db, query, scope.caller);
      query = query.where(source.levelOn(scope.caller, scope.record ?? null), '>=', READ_RANK);
      return new ScopedDefinitions(query);
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
