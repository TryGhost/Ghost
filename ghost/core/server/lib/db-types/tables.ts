// The types of a table's rows, derived from the table's definition in `schema.ts`, so a service
// that queries a table doesn't restate its columns. A column that is renamed or removed then
// fails to compile where a write names it, and so does a write of a value the column no longer
// lists.

import type { Knex } from 'knex';
import type schema from '../../data/schema/schema';
import type { TableName } from '../../data/schema/schema';
import type { DatabaseDate } from './date';

type Schema = typeof schema;

/** The columns of a table's definition, without the `@@` entries that describe the table. */
type ColumnsOf<Table extends TableName> = {
  [Name in keyof Schema[Table] as Name extends `@@${string}` ? never : Name]: Schema[Table][Name];
};

/**
 * What a column holds when it isn't null, as either database engine returns it. SQLite returns a
 * boolean as 0 or 1 and a date as a string or a number, so those are read through `DbBoolean`
 * and `DbDate`.
 */
type Held<Column> = Column extends { type: 'string' | 'text' }
  ? string
  : Column extends { type: 'boolean' }
    ? boolean | number
    : Column extends { type: 'integer' | 'bigInteger' }
      ? number
      : Column extends { type: 'dateTime' }
        ? DatabaseDate
        : Column extends { type: 'binary' }
          ? Buffer
          : never;

/**
 * What a write gives a column. A column that lists its values with `isIn` takes only those. The
 * database doesn't check the list, so a read of the column is still any string: a row written by
 * a later version of Ghost can hold a value this version doesn't list.
 */
type Taken<Column> = Column extends { validations: { isIn: readonly [readonly (infer Value)[]] } }
  ? Value
  : Held<Column>;

/**
 * Whether a column can hold null. A column is created `NOT NULL` unless its definition says
 * `nullable: true`. A definition that doesn't keep `nullable` as a literal type reads as one
 * that can, so a null is never left out of a row's type.
 */
type CanBeNull<Column> = Column extends { nullable: infer Nullable }
  ? true extends Nullable
    ? true
    : false
  : false;

/**
 * The columns an insert may leave out: the ones that can be null and the ones with a default.
 * A definition that doesn't keep `defaultTo` as a literal type reads as one without a default,
 * so an insert is never allowed to leave out a column the database requires.
 */
type FilledIn<Table extends TableName> = {
  [Name in keyof ColumnsOf<Table>]: CanBeNull<ColumnsOf<Table>[Name]> extends true
    ? Name
    : ColumnsOf<Table>[Name] extends { defaultTo: unknown }
      ? Name
      : never;
}[keyof ColumnsOf<Table>];

/** Shows a type built from several others as one object type in errors and on hover. */
type Flat<T> = { [Key in keyof T]: T[Key] } & {};

/**
 * A row of `Table` as the database returns it, with every column the schema defines. A column
 * that holds JSON is the JSON text. This is what a query returns before anything parses it.
 */
export type StoredRow<Table extends TableName> = {
  -readonly [Name in keyof ColumnsOf<Table>]: CanBeNull<ColumnsOf<Table>[Name]> extends true
    ? Held<ColumnsOf<Table>[Name]> | null
    : Held<ColumnsOf<Table>[Name]>;
};

/** Every column of `Table` as a write gives it. */
type WrittenRow<Table extends TableName> = {
  -readonly [Name in keyof ColumnsOf<Table>]: CanBeNull<ColumnsOf<Table>[Name]> extends true
    ? Taken<ColumnsOf<Table>[Name]> | null
    : Taken<ColumnsOf<Table>[Name]>;
};

/**
 * What an insert into `Table` names: every column, where a column that can be null or has a
 * default may be left out.
 */
export type NewRow<Table extends TableName> = Flat<
  Omit<WrittenRow<Table>, FilledIn<Table>> & Partial<Pick<WrittenRow<Table>, FilledIn<Table>>>
>;

/** What an update of `Table` may set: any of its columns. */
export type RowUpdate<Table extends TableName> = Partial<WrittenRow<Table>>;

/**
 * `Table` as Knex types a query of it, for the table's entry in Knex's `Tables`:
 *
 *     declare module 'knex/types/tables' {
 *       interface Tables {
 *         gift_links: SchemaTable<'gift_links'>;
 *       }
 *     }
 *
 * A query reads `StoredRow`, an insert takes `NewRow` and an update takes `RowUpdate`. A service
 * that allows less says so in `Allowing`, with types built from those three so the columns still
 * come from the schema. A table whose rows are never updated is
 * `SchemaTable<'app_installation_manifests', { update: never }>`.
 *
 * Only a table with an entry is typed. The entry applies to every query of the table by name,
 * including a migration's, and a migration runs against the table as it was at the time. A
 * migration that names a column the table no longer has gives the query its own row type.
 */
export type SchemaTable<
  Table extends TableName,
  Allowing extends { row?: object; insert?: unknown; update?: unknown } = object,
> = Knex.CompositeTableType<
  Allowing extends { row: infer Row } ? Row : StoredRow<Table>,
  Allowing extends { insert: infer Insert } ? Insert : NewRow<Table>,
  Allowing extends { update: infer Update } ? Update : RowUpdate<Table>
>;
