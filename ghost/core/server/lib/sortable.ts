import errors from '@tryghost/errors';
import type { Knex } from 'knex';
import type { Tables as KnexTables } from 'knex/types/tables';
import { z } from 'zod';
import { type SortableDefinition, sortableDeclarationProblems } from '../data/schema/lib/sortable';
import schema from '../data/schema/schema';
import type { TableDefinition } from '../data/schema/types';
import { DbCount } from './db-types/count';
import { ensureTransaction } from './ensure-transaction';

/**
 * The parent a collection belongs to, as the column the collection is declared `within` and the
 * parent's value for it, such as `{post_id: post.id}`. Empty for a collection that is the whole
 * table.
 */
export type SortableScope = Record<string, string>;

/** A row as the database returns it. The caller parses what it selects. */
type Row = Record<string, unknown>;

declare const throughSortable: unique symbol;

/**
 * The insert type of a table whose rows are a sortable collection, for the table's entry in
 * Knex's `Tables`. `NewRow` is what an insert names, without the position column. A value of
 * this type can't be made, so `knex('<table>').insert()` doesn't compile, and rows are inserted
 * through the collection's `insert`, which gives each its position.
 */
export type SortableInsert<NewRow> = NewRow & { readonly [throughSortable]: never };

/**
 * A sortable collection: rows kept in an order. A position only says where a row comes in the
 * order, so callers insert and reorder through the collection, and never read or write a
 * position themselves.
 *
 * Every method reads or writes through the connection or transaction it is given. The methods
 * take no lock that keeps other writers out of the collection. Where the order under writes at
 * the same time matters, the caller first takes a lock that every writer of the collection
 * takes, before the transaction reads anything else: a plain read made earlier fixes what the
 * transaction sees, and `insert` would then not see rows committed since. For a collection
 * scoped to a parent that lock is the parent's row lock, as the row locking rules in
 * `docs/codebase/database.md` require for a record's relations. Without it, a reorder can also
 * deadlock with another write to the parent's rows, such as a delete, and one of the two fails.
 */
export interface Sortable<Scope extends SortableScope = SortableScope, NewRow = Row> {
  /**
   * A query for the collection's rows in order: by position, then by the declared tie-break
   * columns, then by id, so the order is the same on every read. The caller can add to the
   * query, such as which columns to select.
   */
  inOrder(db: Knex, scope: Scope): Knex.QueryBuilder<Row, Row[]>;
  /**
   * Inserts `row` at the end of the collection. The collection sets the row's position and, for
   * a collection scoped to a parent, its parent column from `scope`. The end is the highest
   * position the transaction can see, so rows inserted by transactions that run at the same
   * time can get the same position, which the tie-break then orders, or a position before a row
   * that was inserted and committed in the meantime. An error from the database, such as a
   * value that is already taken, is thrown as it is.
   */
  insert(db: Knex, scope: Scope, row: NewRow): Promise<void>;
  /**
   * Replaces the order of the whole collection with the order of `orderedIds`. Fails with a
   * ValidationError, and changes nothing, unless `orderedIds` has the id of every row in the
   * collection exactly once: an order that leaves rows out, or includes rows that have since
   * been deleted, was made from an out-of-date copy of the collection.
   */
  reorder(db: Knex, scope: Scope, orderedIds: readonly string[]): Promise<void>;
}

const Ids = z.array(z.string());
const Highest = z.object({ highest: DbCount.nullable() }).optional();

/**
 * The sortable collection `definition` declares in `table`. Rows are identified by their `id`
 * column.
 */
function sortableCollection(table: string, definition: SortableDefinition): Sortable {
  const { column, within, tieBreak } = definition;

  /**
   * The condition that selects the collection's rows: `scope` once it is known to name the
   * collection's parent column and nothing else, with the column qualified by the table so it
   * stays unambiguous when the caller joins another table.
   */
  function rowsOf(scope: SortableScope): Record<string, string> {
    const given = Object.keys(scope);
    const expected = within === undefined ? [] : [within];
    if (given.length !== expected.length || given.some((key) => !expected.includes(key))) {
      throw new errors.IncorrectUsageError({
        message:
          within === undefined
            ? `The sortable collection in ${table} has no scope, but one was given.`
            : `The sortable collection in ${table} is scoped by ${within}.`,
      });
    }
    return Object.fromEntries(
      Object.entries(scope).map(([parentColumn, parent]) => [`${table}.${parentColumn}`, parent]),
    );
  }

  const id = `${table}.id`;
  // The id comes last, so rows that tie on every declared column still have one order.
  const orderedBy = [...new Set([column, ...tieBreak, 'id'])];

  return {
    inOrder(db, scope) {
      const query = db<Row, Row[]>(table).where(rowsOf(scope));
      for (const orderColumn of orderedBy) {
        query.orderBy(`${table}.${orderColumn}`, 'asc');
      }
      return query;
    },

    async insert(db, scope, row) {
      const collection = rowsOf(scope);
      return ensureTransaction(db, async (trx) => {
        const last: unknown = await trx(table)
          .where(collection)
          .max({ highest: `${table}.${column}` })
          .first();
        const highest = Highest.parse(last)?.highest ?? null;
        // The first row of a collection starts the order.
        const position = highest === null ? 0 : highest + 1;
        await trx(table).insert({ ...row, ...scope, [column]: position });
      });
    },

    async reorder(db, scope, orderedIds) {
      const collection = rowsOf(scope);
      return ensureTransaction(db, async (trx) => {
        // The rows are locked in id order, and written in that order below, so two reorders of
        // one collection at the same time take their locks in the same sequence and can't
        // deadlock with each other. That holds while no index contains the position column,
        // which the schema's unit test checks: MySQL would read through such an index and lock
        // the rows in position order.
        const existing = Ids.parse(
          await trx(table).where(collection).orderBy(id, 'asc').forUpdate().pluck(id),
        );
        const positions = new Map(orderedIds.map((rowId, position) => [rowId, position]));
        const namesEveryRowOnce =
          positions.size === orderedIds.length &&
          positions.size === existing.length &&
          existing.every((rowId) => positions.has(rowId));
        if (!namesEveryRowOnce) {
          throw new errors.ValidationError({
            message: 'The order must include every item exactly once. Reload and try again.',
          });
        }

        for (const rowId of existing) {
          await trx(table)
            .where({ ...collection, [id]: rowId })
            .update({ [column]: positions.get(rowId) });
        }
      });
    },
  };
}

/** The tables among `Tables` that declare a sortable collection. */
type SortableTableOf<Tables> = {
  [Table in keyof Tables]: Tables[Table] extends { '@@SORTABLE@@': unknown } ? Table : never;
}[keyof Tables] &
  string;

/** The sortable collection `Table` declares. */
type DeclaredIn<Tables, Table extends keyof Tables> = Tables[Table] extends {
  '@@SORTABLE@@': infer Declared extends SortableDefinition;
}
  ? Declared
  : never;

/** The column that scopes a collection to a parent, when its declaration names one. */
type ParentOf<Declared> = Declared extends { within: infer Parent extends string } ? Parent : never;

/**
 * The scope a collection is called with: its parent column and the parent's value, or nothing
 * for a collection that is the whole table. A declaration made without `sortableBy` has no
 * literal column names for the compiler to read, so its scope is only checked when it is used.
 */
type ScopeOf<Declared extends SortableDefinition> = string extends Declared['column']
  ? SortableScope
  : [ParentOf<Declared>] extends [never]
    ? Record<string, never>
    : Record<ParentOf<Declared>, string>;

/**
 * The row a collection's `insert` takes: what the table's entry in Knex's `Tables` says an
 * insert names, without the columns the collection sets. A table with no entry there takes any
 * row.
 */
type NewRowOf<Table, Declared extends SortableDefinition> = Table extends keyof KnexTables
  ? Omit<
      Knex.ResolveTableType<KnexTables[Table], 'insert'>,
      typeof throughSortable | Declared['column'] | ParentOf<Declared>
    >
  : Row;

/**
 * A function that gives the sortable collection a table declares with `sortableBy`, for the
 * tables of `tables`. Ghost's own tables are `sortable`, below.
 */
export function sortableIn<Tables extends Record<string, TableDefinition>>(tables: Tables) {
  const declarations: Record<string, TableDefinition> = tables;

  return function sortableFor<Table extends SortableTableOf<Tables>>(
    table: Table,
  ): Sortable<ScopeOf<DeclaredIn<Tables, Table>>, NewRowOf<Table, DeclaredIn<Tables, Table>>> {
    const declaring = declarations[table];
    const definition = declaring['@@SORTABLE@@'];
    if (!definition) {
      throw new errors.IncorrectUsageError({
        message: `${table} declares no sortable collection.`,
      });
    }

    const problems = sortableDeclarationProblems(declaring);
    if (problems.length > 0) {
      throw new errors.IncorrectUsageError({
        message: `${table} declares a sortable collection that can't be used: ${problems.join('; ')}.`,
      });
    }
    return sortableCollection(table, definition);
  };
}

/**
 * The sortable collection `table` declares with `sortableBy` in the schema. The compiler checks
 * that the table declares one, the scope each operation is called with, and the row `insert`
 * is given.
 */
export const sortable = sortableIn(schema);
