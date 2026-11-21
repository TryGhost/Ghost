import DatabaseInfo from '@tryghost/database-info';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import tpl from '@tryghost/tpl';
import type { Knex } from 'knex';
import _ from 'lodash';
import * as db from '../db';
import { type PatternCheck, patternChecksOf } from './lib/column-patterns';
import { defaultIndexName } from './lib/default-index-name';
import { type ForeignKeySpec, foreignKeySpecsOf, onDeleteOf } from './lib/foreign-keys';
import schema from './schema';
import type {
  ColumnDefinition,
  ColumnMigrationOptions,
  IndexDefinition,
  TableDefinition,
  UniqueConstraintDefinition,
} from './types';

type Algorithm = ColumnMigrationOptions['algorithm'];

const tables = schema as unknown as Record<string, TableDefinition>;

type TableBuilder = Knex.CreateTableBuilder | Knex.AlterTableBuilder;

// The knex column builder methods a column `type` names, called on the table builder.
type ColumnMethod = (columnName: string, ...args: unknown[]) => Knex.ColumnBuilder;

// knex accepts these at runtime, but its types don't declare them.
type LooseColumnBuilder = Omit<Knex.ColumnBuilder, 'nullable'> & {
  nullable(nullable?: boolean): Knex.ColumnBuilder;
};
type LooseColumnSpec = { unsigned?: boolean; defaultTo?: Knex.Value };
const columnList = (columns: string | string[]) => columns as string[];

const errorCode = (err: unknown) => (err as { code?: string }).code;

const messages = {
  hasPrimaryKeySQLiteError: 'Must use hasPrimaryKeySQLite on an SQLite3 database',
  hasForeignSQLite3: 'Must use hasForeignSQLite3 on an SQLite3 database',
  noSupportForDatabase: 'No support for database client {client}',
};

/**
 * Adds a column to a table being built. A `references` on the column is built by
 * `addForeignKey`, like any other foreign key, and a `pattern` by the caller, as a check on
 * the table.
 *
 * @param [collation] - collation to give a string column, instead of the table's default
 */
function addTableColumn(
  tableName: string,
  tableBuilder: TableBuilder,
  columnName: string,
  columnSpec: ColumnDefinition = tables[tableName]![columnName] as ColumnDefinition,
  collation?: string,
) {
  let column: LooseColumnBuilder;
  const columnMethod = (type: ColumnDefinition['type']) =>
    (tableBuilder[type] as ColumnMethod).bind(tableBuilder);

  // creation distinguishes between text with fieldtype, string with maxlength and all others
  if (columnSpec.type === 'text' && Object.hasOwn(columnSpec, 'fieldtype')) {
    column = columnMethod(columnSpec.type)(columnName, columnSpec.fieldtype);
  } else if (columnSpec.type === 'binary' && Object.hasOwn(columnSpec, 'maxlength')) {
    // knex emits an unbounded `blob` for a length-less binary column, which
    // MySQL can only index with a prefix. Passing the length gives us
    // `varbinary(N)`, which is indexable in full.
    column = columnMethod(columnSpec.type)(columnName, columnSpec.maxlength);
  } else if (columnSpec.type === 'string') {
    if (Object.hasOwn(columnSpec, 'maxlength')) {
      column = columnMethod(columnSpec.type)(columnName, columnSpec.maxlength);
    } else {
      column = columnMethod(columnSpec.type)(columnName, 191);
    }
  } else if (columnSpec.type === 'dateTime' && Object.hasOwn(columnSpec, 'precision')) {
    column = tableBuilder.dateTime(columnName, { precision: columnSpec.precision });
  } else {
    column = columnMethod(columnSpec.type)(columnName);
  }

  if (collation && columnSpec.type === 'string') {
    column.collate(collation);
  }

  if (Object.hasOwn(columnSpec, 'nullable') && columnSpec.nullable === true) {
    column.nullable();
  } else {
    column.nullable(false);
  }
  if (Object.hasOwn(columnSpec, 'primary') && columnSpec.primary === true) {
    column.primary();
  }
  if (Object.hasOwn(columnSpec, 'unique') && columnSpec.unique) {
    column.unique();
  }
  if (Object.hasOwn(columnSpec, 'unsigned') && (columnSpec as LooseColumnSpec).unsigned) {
    column.unsigned();
  }
  if (Object.hasOwn(columnSpec, 'defaultTo')) {
    column.defaultTo((columnSpec as LooseColumnSpec).defaultTo!);
  }
  if (Object.hasOwn(columnSpec, 'index') && columnSpec.index === true) {
    column.index();
  }
}

/**
 * The check constraints a table's column patterns become. Read on every database, so a
 * pattern MySQL would refuse fails everywhere, but held only on MySQL: SQLite is being
 * removed, and its driver here has no regular expression function.
 *
 * Each is declared on the table rather than on its column, because MariaDB can only name a
 * check on the table.
 *
 * @param transaction - the connection the table is built on
 */
function patternChecksOn(
  tableName: string,
  tableSpec: Record<string, unknown>,
  transaction: Knex,
): PatternCheck[] {
  const checks = patternChecksOf(tableName, tableSpec);
  return DatabaseInfo.isMySQL(transaction) ? checks : [];
}

/**
 * Adds a foreign key to a table being built. The referenced columns must be exactly the
 * parent's primary key or one of its unique constraints, in the same order: SQLite creates
 * the key regardless, then fails every write it has to check.
 */
function addForeignKey(tableBuilder: TableBuilder, foreignKey: ForeignKeySpec) {
  const constraint = tableBuilder
    .foreign(foreignKey.columns, foreignKey.constraintName)
    .references(foreignKey.references.columns)
    .inTable(foreignKey.references.table);
  const onDelete = onDeleteOf(foreignKey);
  if (onDelete) {
    constraint.onDelete(onDelete);
  }
}

function setNullable(tableName: string, column: string, transaction: Knex = db.knex) {
  return transaction.schema.table(tableName, function (table) {
    table.setNullable(column);
  });
}

function dropNullable(tableName: string, column: string, transaction: Knex = db.knex) {
  return transaction.schema.table(tableName, function (table) {
    table.dropNullable(column);
  });
}

// MySQL raises these when an explicit ALGORITHM isn't supported for the operation,
// which varies by server version (RENAME COLUMN only accepts INSTANT from 8.0.28).
const UNSUPPORTED_ALGORITHM_ERRORS = new Set([
  'ER_ALTER_OPERATION_NOT_SUPPORTED',
  'ER_ALTER_OPERATION_NOT_SUPPORTED_REASON',
]);

/**
 * Runs an ALTER TABLE with an explicit MySQL algorithm, retrying without it if the
 * server doesn't support that algorithm for the operation.
 *
 * @param sql - ALTER statement without a trailing semicolon or algorithm clause
 */
async function rawWithAlgorithm(transaction: Knex, sql: string, algorithm?: Algorithm) {
  if (!algorithm || algorithm === 'auto') {
    return await transaction.raw(sql);
  }

  try {
    return await transaction.raw(`${sql}, algorithm=${algorithm}`);
  } catch (err) {
    if (!UNSUPPORTED_ALGORITHM_ERRORS.has(errorCode(err) as string)) {
      throw err;
    }

    logging.warn(
      `ALGORITHM=${algorithm} is not supported by this server for: ${sql} - retrying without it`,
    );
    return await transaction.raw(sql);
  }
}

/**
 * @param [options.algorithm] - MySQL only
 */
async function addColumn(
  tableName: string,
  column: string,
  transaction: Knex = db.knex,
  columnSpec: ColumnDefinition = tables[tableName]![column] as ColumnDefinition,
  options: ColumnMigrationOptions = {},
) {
  const checks = patternChecksOn(tableName, { [column]: columnSpec }, transaction);
  const addColumnBuilder = transaction.schema.table(tableName, function (table) {
    addTableColumn(tableName, table, column, columnSpec);
    foreignKeySpecsOf({ [column]: columnSpec }).forEach((foreignKey) =>
      addForeignKey(table, foreignKey),
    );
  });

  // Use the default flow for SQLite because .toSQL() is tricky with SQLite when
  // it does the table dance
  if (DatabaseInfo.isSQLite(transaction)) {
    await addColumnBuilder;
    return;
  }

  for (const [index, sqlQuery] of addColumnBuilder.toSQL().entries()) {
    if (!DatabaseInfo.isMySQL(transaction)) {
      await transaction.raw(sqlQuery.sql);
      continue;
    }

    // Guard against an ending semicolon
    let sql = sqlQuery.sql.replace(/;\s*$/, '');
    // The checks go in the statement that adds the column, which knex sends first, so a
    // column that rows already in the table would break is not added at all. A knex table
    // check would be a statement of its own, and loses its bindings when altering a table.
    if (index === 0) {
      sql += checks
        .map((check) =>
          transaction
            .raw(', add constraint ?? check (?? REGEXP ?)', [
              check.constraintName,
              check.column,
              check.pattern,
            ])
            .toQuery(),
        )
        .join('');
    }
    // default to copy if not specified
    await rawWithAlgorithm(transaction, sql, options?.algorithm || 'copy');
  }
}

/**
 * @param [options.algorithm] - MySQL only
 */
async function dropColumn(
  tableName: string,
  column: string,
  transaction: Knex = db.knex,
  columnSpec: Partial<ColumnDefinition> = {},
  options: ColumnMigrationOptions = {},
) {
  if (Object.hasOwn(columnSpec, 'references')) {
    const foreignKeyColumn = columnSpec as { references: string; constraintName?: string };
    const [toTable, toColumn] = foreignKeyColumn.references.split('.') as [string, string];
    await dropForeign({
      fromTable: tableName,
      fromColumn: column,
      toTable,
      toColumn,
      constraintName: foreignKeyColumn.constraintName,
      transaction,
    });
  }

  const dropColumnBuilder = transaction.schema.table(tableName, function (table) {
    table.dropColumn(column);
  });

  // Use the default flow for SQLite because .toSQL() is tricky with SQLite when
  // it does the table dance
  if (DatabaseInfo.isSQLite(transaction)) {
    await dropColumnBuilder;
    return;
  }

  for (const sqlQuery of dropColumnBuilder.toSQL()) {
    if (!DatabaseInfo.isMySQL(transaction)) {
      await transaction.raw(sqlQuery.sql);
      continue;
    }

    // Guard against an ending semicolon
    const sql = sqlQuery.sql.replace(/;\s*$/, '');
    // default to copy if not specified
    await rawWithAlgorithm(transaction, sql, options?.algorithm || 'copy');
  }
}

/**
 * @param [options.algorithm] - MySQL only
 */
async function renameColumn(
  tableName: string,
  from: string,
  to: string,
  transaction: Knex = db.knex,
  options: ColumnMigrationOptions = {},
) {
  logging.info(`Renaming column '${from}' to '${to}' in table '${tableName}'`);

  if (DatabaseInfo.isMySQL(transaction)) {
    // The knex helper does a lot of interesting things with foreign keys that are slow on bigger MySQL clusters
    const sql = `ALTER TABLE \`${tableName}\` RENAME COLUMN \`${from}\` TO \`${to}\``;
    return await rawWithAlgorithm(transaction, sql, options.algorithm);
  }

  return await transaction.schema.table(tableName, function (table) {
    table.renameColumn(from, to);
  });
}

/**
 * Builds the column arguments for a MySQL index prefix, such as `col(123)`.
 */
function prefixIndexColumns(knex: Knex, columns: string | string[], length: number): Knex.Raw[] {
  return (Array.isArray(columns) ? columns : [columns]).map((col) =>
    knex.raw('?? (?)', [col, length]),
  );
}

/**
 * Adds an non-unique index to a table over the given columns.
 *
 * @param tableName - name of the table to add indexes to
 * @param columns - column(s) to add indexes for
 * @param [transaction] - connection object containing knex reference
 * @param [options.length] - MySQL only: create a prefix index of this many characters
 */
async function addIndex(
  tableName: string,
  columns: string | string[],
  transaction: Knex = db.knex,
  options: { length?: number } = {},
) {
  try {
    logging.info(`Adding index for '${columns}' in table '${tableName}'`);

    return await transaction.schema.table(tableName, function (table) {
      if (options.length && DatabaseInfo.isMySQL(transaction)) {
        table.index(
          prefixIndexColumns(transaction, columns, options.length),
          defaultIndexName(tableName, columns),
        );
      } else {
        table.index(columns);
      }
    });
  } catch (err) {
    if (errorCode(err) === 'SQLITE_ERROR') {
      logging.warn(`Index for '${columns}' already exists for table '${tableName}'`);
      return;
    }
    if (errorCode(err) === 'ER_DUP_KEYNAME') {
      logging.warn(`Index for '${columns}' already exists for table '${tableName}'`);
      return;
    }
    throw err;
  }
}

/**
 * Drops a non-unique index from a table over the given columns.
 *
 * @param tableName - name of the table to remove indexes from
 * @param columns - column(s) to remove indexes for
 * @param [transaction] - connection object containing knex reference
 */
async function dropIndex(
  tableName: string,
  columns: string | string[],
  transaction: Knex = db.knex,
) {
  try {
    logging.info(`Dropping index for '${columns}' in table '${tableName}'`);

    return await transaction.schema.table(tableName, function (table) {
      table.dropIndex(columns);
    });
  } catch (err) {
    if (errorCode(err) === 'SQLITE_ERROR') {
      logging.warn(`Constraint for '${columns}' does not exist for table '${tableName}'`);
      return;
    }
    if (errorCode(err) === 'ER_CANT_DROP_FIELD_OR_KEY') {
      logging.warn(`Constraint for '${columns}' does not exist for table '${tableName}'`);
      return;
    }
    throw err;
  }
}

/**
 * Adds an unique index to a table over the given columns.
 *
 * @param tableName - name of the table to add unique constraint to
 * @param columns - column(s) to form unique constraint with
 * @param [transaction] - connection object containing knex reference
 * @param [indexName] - name for the constraint; knex derives one from the table
 * and every column when omitted, which can overrun MySQL's 64-character limit
 */
async function addUnique(
  tableName: string,
  columns: string | string[],
  transaction: Knex = db.knex,
  indexName?: string,
) {
  try {
    logging.info(`Adding unique constraint for '${columns}' in table '${tableName}'`);

    return await transaction.schema.table(tableName, function (table) {
      // Knex derives a name from the table and every column when it is not given
      // one, and that can overrun MySQL's 64-character identifier limit on a wide
      // table or a constraint over several columns.
      table.unique(columns, indexName ? { indexName } : undefined);
    });
  } catch (err) {
    if (errorCode(err) === 'SQLITE_ERROR') {
      logging.warn(`Constraint for '${columns}' already exists for table '${tableName}'`);
      return;
    }
    if (errorCode(err) === 'ER_DUP_KEYNAME') {
      logging.warn(`Constraint for '${columns}' already exists for table '${tableName}'`);
      return;
    }
    throw err;
  }
}

/**
 * Drops a unique key constraint from a table.
 *
 * @param tableName - name of the table to drop unique constraint from
 * @param columns - column(s) unique constraint was formed
 * @param transaction - connection object containing knex reference
 */
async function dropUnique(
  tableName: string,
  columns: string | string[],
  transaction: Knex = db.knex,
  indexName?: string,
) {
  try {
    logging.info(`Dropping unique constraint for '${columns}' in table '${tableName}'`);

    return await transaction.schema.table(tableName, function (table) {
      // Named constraints have to be dropped by that name: the one knex would
      // derive from the columns is not what is on the table.
      table.dropUnique(columnList(columns), indexName);
    });
  } catch (err) {
    if (errorCode(err) === 'SQLITE_ERROR') {
      logging.warn(`Constraint for '${columns}' does not exist for table '${tableName}'`);
      return;
    }
    if (errorCode(err) === 'ER_CANT_DROP_FIELD_OR_KEY') {
      logging.warn(`Constraint for '${columns}' does not exist for table '${tableName}'`);
      return;
    }
    throw err;
  }
}

type ForeignKeyConfiguration = {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
  constraintName?: string;
  transaction?: Knex;
};

/**
 * Checks if a foreign key exists in a table over the given columns.
 *
 * @param configuration - contains all configuration for this function
 * @param configuration.fromTable - name of the table to add the foreign key to
 * @param configuration.fromColumn - column of the table to add the foreign key to
 * @param configuration.toTable - name of the table to point the foreign key to
 * @param configuration.toColumn - column of the table to point the foreign key to
 * @param [configuration.transaction] - connection object containing knex reference
 */
async function hasForeignSQLite({
  fromTable,
  fromColumn,
  toTable,
  toColumn,
  transaction = db.knex,
}: ForeignKeyConfiguration) {
  if (!DatabaseInfo.isSQLite(transaction)) {
    throw new errors.InternalServerError({
      message: tpl(messages.hasForeignSQLite3),
    });
  }

  const foreignKeys: { table: string; from: string; to: string }[] = await transaction.raw(
    `PRAGMA foreign_key_list('${fromTable}');`,
  );

  const hasForeignKey = foreignKeys.some(
    (foreignKey) =>
      foreignKey.table === toTable && foreignKey.from === fromColumn && foreignKey.to === toColumn,
  );

  return hasForeignKey;
}

/**
 * Adds a foreign key to a table.
 *
 * @param configuration - contains all configuration for this function
 * @param configuration.fromTable - name of the table to add the foreign key to
 * @param configuration.fromColumn - column of the table to add the foreign key to
 * @param configuration.toTable - name of the table to point the foreign key to
 * @param configuration.toColumn - column of the table to point the foreign key to
 * @param [configuration.constraintName] - name of the FK to create
 * @param [configuration.cascadeDelete] - adds the "on delete cascade" option if true
 * @param [configuration.setNullDelete] - adds the "on delete SET NULL" option if true
 * @param [configuration.transaction] - connection object containing knex reference
 */
async function addForeign({
  fromTable,
  fromColumn,
  toTable,
  toColumn,
  constraintName,
  cascadeDelete = false,
  setNullDelete = false,
  transaction = db.knex,
}: ForeignKeyConfiguration & { cascadeDelete?: boolean; setNullDelete?: boolean }) {
  if (DatabaseInfo.isSQLite(transaction)) {
    const foreignKeyExists = await hasForeignSQLite({
      fromTable,
      fromColumn,
      toTable,
      toColumn,
      transaction,
    });
    if (foreignKeyExists) {
      logging.warn(
        `Skipped adding foreign key from ${fromTable}.${fromColumn} to ${toTable}.${toColumn} - already exists`,
      );
      return;
    }
  }
  try {
    logging.info(`Adding foreign key from ${fromTable}.${fromColumn} to ${toTable}.${toColumn}`);

    //disable and re-enable foreign key checks on sqlite because of https://github.com/knex/knex/issues/4155
    let foreignKeysEnabled: { foreign_keys: number }[] | undefined;
    if (DatabaseInfo.isSQLite(transaction)) {
      foreignKeysEnabled = await db.knex.raw('PRAGMA foreign_keys;');
      if (foreignKeysEnabled![0]!.foreign_keys) {
        await db.knex.raw('PRAGMA foreign_keys = OFF;');
      }
    }

    await transaction.schema.table(fromTable, function (table) {
      const fkBuilder = table.foreign(fromColumn).references(`${toTable}.${toColumn}`);
      const onDelete = onDeleteOf({ cascadeDelete, setNullDelete });
      if (onDelete) {
        fkBuilder.onDelete(onDelete);
      }

      if (constraintName) {
        fkBuilder.withKeyName(constraintName);
      }
    });

    if (DatabaseInfo.isSQLite(transaction)) {
      if (foreignKeysEnabled![0]!.foreign_keys) {
        await db.knex.raw('PRAGMA foreign_keys = ON;');
      }
    }
  } catch (err) {
    if (
      errorCode(err) === 'ER_DUP_KEY' ||
      errorCode(err) === 'ER_FK_DUP_KEY' ||
      errorCode(err) === 'ER_FK_DUP_NAME'
    ) {
      logging.warn(
        `Skipped adding foreign key from ${fromTable}.${fromColumn} to ${toTable}.${toColumn} - already exists`,
      );
      return;
    }
    throw err;
  }
}

/**
 * Drops a foreign key from a table.
 *
 * @param configuration - contains all configuration for this function
 * @param configuration.fromTable - name of the table to add the foreign key to
 * @param configuration.fromColumn - column of the table to add the foreign key to
 * @param configuration.toTable - name of the table to point the foreign key to
 * @param configuration.toColumn - column of the table to point the foreign key to
 * @param [configuration.constraintName] - name of the FK to delete
 * @param [configuration.transaction] - connection object containing knex reference
 */
async function dropForeign({
  fromTable,
  fromColumn,
  toTable,
  toColumn,
  constraintName,
  transaction = db.knex,
}: ForeignKeyConfiguration) {
  if (DatabaseInfo.isSQLite(transaction)) {
    const foreignKeyExists = await hasForeignSQLite({
      fromTable,
      fromColumn,
      toTable,
      toColumn,
      transaction,
    });
    if (!foreignKeyExists) {
      logging.warn(
        `Skipped dropping foreign key from ${fromTable}.${fromColumn} to ${toTable}.${toColumn} - does not exist`,
      );
      return;
    }
  }
  try {
    logging.info(`Dropping foreign key from ${fromTable}.${fromColumn} to ${toTable}.${toColumn}`);

    //disable and re-enable foreign key checks on sqlite because of https://github.com/knex/knex/issues/4155
    let foreignKeysEnabled: { foreign_keys: number }[] | undefined;
    if (DatabaseInfo.isSQLite(transaction)) {
      foreignKeysEnabled = await db.knex.raw('PRAGMA foreign_keys;');
      if (foreignKeysEnabled![0]!.foreign_keys) {
        await db.knex.raw('PRAGMA foreign_keys = OFF;');
      }
    }

    await transaction.schema.table(fromTable, function (table) {
      table.dropForeign(fromColumn, constraintName);
    });

    if (DatabaseInfo.isSQLite(transaction)) {
      if (foreignKeysEnabled![0]!.foreign_keys) {
        await db.knex.raw('PRAGMA foreign_keys = ON;');
      }
    }
  } catch (err) {
    if (errorCode(err) === 'ER_CANT_DROP_FIELD_OR_KEY') {
      logging.warn(
        `Skipped dropping foreign key from ${fromTable}.${fromColumn} to ${toTable}.${toColumn} - does not exist`,
      );
      return;
    }
    throw err;
  }
}

/**
 * Checks if primary key index exists in a table over the given columns.
 *
 * @param tableName - name of the table to check primary key constraint on
 * @param [transaction] - connection object containing knex reference
 */
async function hasPrimaryKeySQLite(tableName: string, transaction: Knex = db.knex) {
  if (!DatabaseInfo.isSQLite(transaction)) {
    throw new errors.InternalServerError({
      message: tpl(messages.hasPrimaryKeySQLiteError),
    });
  }

  const rawConstraints: { origin: string }[] = await transaction.raw(
    `PRAGMA index_list('${tableName}');`,
  );
  const tablePrimaryKey = rawConstraints.find((c) => c.origin === 'pk');

  return tablePrimaryKey;
}

/**
 * Adds an primary key index to a table over the given columns.
 *
 * @param tableName - name of the table to add primaykey  constraint to
 * @param columns - column(s) to form primary key constraint with
 * @param [transaction] - connection object containing knex reference
 */
async function addPrimaryKey(
  tableName: string,
  columns: string | string[],
  transaction: Knex = db.knex,
) {
  if (DatabaseInfo.isSQLite(transaction)) {
    const primaryKeyExists = await hasPrimaryKeySQLite(tableName, transaction);
    if (primaryKeyExists) {
      logging.warn(
        `Primary key constraint for '${columns}' already exists for table '${tableName}'`,
      );
      return;
    }
  }
  try {
    logging.info(`Adding primary key constraint for '${columns}' in table '${tableName}'`);
    return await transaction.schema.table(tableName, function (table) {
      table.primary(columnList(columns));
    });
  } catch (err) {
    if (errorCode(err) === 'ER_MULTIPLE_PRI_KEY') {
      logging.warn(
        `Primary key constraint for '${columns}' already exists for table '${tableName}'`,
      );
      return;
    }
    throw err;
  }
}

/**
 * The collation MySQL gives each column of a table's foreign keys, read from the columns they
 * reference. A foreign key needs both columns to share a collation, but a table created
 * without one takes the server's default for its character set, and that is not always what
 * the existing tables were created with: the default changed between MySQL 5.7 and 8, and
 * differs again on MariaDB. Creating the table with the collation of the columns it
 * references keeps it compatible, whatever the default.
 *
 * Empty on SQLite, and when `database.connection.collate` is set: knex then creates every
 * table with that collation, so the operator has chosen it.
 *
 * @param tableSpec - table schema the table is created with
 * @param transaction - connection to the DB
 * @returns the collation to give each foreign key column, by column name
 */
async function getForeignKeyCollations(
  tableSpec: TableDefinition,
  transaction: Knex,
): Promise<Record<string, string>> {
  const connectionSettings = (transaction.client as { connectionSettings?: { collate?: string } })
    .connectionSettings;
  if (!DatabaseInfo.isMySQL(transaction) || connectionSettings?.collate) {
    return {};
  }

  // Each column of a key over several is paired with the column it references at the same
  // position. A column in more than one key takes the collation of the last.
  const referencedBy = new Map<string, { table: string; column: string }>();
  foreignKeySpecsOf(tableSpec).forEach(({ columns, references }) => {
    columns.forEach((column, index) => {
      referencedBy.set(column, { table: references.table, column: references.columns[index]! });
    });
  });

  if (referencedBy.size === 0) {
    return {};
  }

  const referenced = [...referencedBy.values()];
  const [rows] = (await transaction.raw(
    `SELECT TABLE_NAME AS tableName, COLUMN_NAME AS columnName, COLLATION_NAME AS collation
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND COLLATION_NAME IS NOT NULL
       AND (TABLE_NAME, COLUMN_NAME) IN (${referenced.map(() => '(?, ?)').join(', ')})`,
    referenced.flatMap(({ table, column }) => [table, column]),
  )) as [{ tableName: string; columnName: string; collation: string }[]];

  const collations: Record<string, string> = {};
  for (const [column, reference] of referencedBy) {
    const match = rows.find(
      (row) => row.tableName === reference.table && row.columnName === reference.column,
    );
    if (match) {
      collations[column] = match.collation;
    }
  }
  return collations;
}

/**
 * Builds the statement that adds a table according to the provided spec, without running it
 *
 * @param table - name of the table to create
 * @param transaction - connection to the DB
 * @param tableSpec - table schema to generate table with
 * @param [collations] - the collation to give each string column, by column name
 */
function buildTable(
  table: string,
  transaction: Knex,
  tableSpec: TableDefinition,
  collations: Record<string, string> = {},
) {
  return transaction.schema.createTable(table, function (t) {
    Object.keys(tableSpec)
      .filter((column) => !column.startsWith('@@'))
      .forEach((column) =>
        addTableColumn(table, t, column, tableSpec[column] as ColumnDefinition, collations[column]),
      );

    if (tableSpec['@@INDEXES@@']) {
      tableSpec['@@INDEXES@@'].forEach((index: IndexDefinition) => {
        // The object form is for a prefix index, or for when the name knex derives from
        // the table and every column would overrun MySQL's 64-character limit.
        if (index && typeof index === 'object' && !Array.isArray(index)) {
          if (index.length && DatabaseInfo.isMySQL(transaction)) {
            t.index(
              prefixIndexColumns(transaction, index.columns, index.length),
              index.indexName ?? defaultIndexName(table, index.columns),
            );
          } else {
            // SQLite doesn't support prefix indexes, so we index the whole thing.
            t.index(index.columns, index.indexName);
          }
        } else {
          t.index(index);
        }
      });
    }
    if (tableSpec['@@UNIQUE_CONSTRAINTS@@']) {
      tableSpec['@@UNIQUE_CONSTRAINTS@@'].forEach((unique: UniqueConstraintDefinition) => {
        // An entry is normally the columns alone, and knex names the constraint
        // after the table and every one of them. The object form is for when
        // that derived name would overrun MySQL's 64-character limit.
        if (unique && typeof unique === 'object' && !Array.isArray(unique)) {
          t.unique(unique.columns, { indexName: unique.indexName });
        } else {
          t.unique(unique);
        }
      });
    }
    if (tableSpec['@@PRIMARY_KEY@@']) {
      t.primary(tableSpec['@@PRIMARY_KEY@@']);
    }
    foreignKeySpecsOf(tableSpec).forEach((foreignKey) => addForeignKey(t, foreignKey));
    patternChecksOn(table, tableSpec, transaction).forEach((check) =>
      t.check('?? REGEXP ?', [check.column, check.pattern], check.constraintName),
    );
  });
}

/**
 * Adds a table according to the provided spec, or falls back to the current schema
 *
 * NOTE: this function does NOT check if the table already exists - use the migration
 * utils if you want that
 *
 * @param table - name of the table to create
 * @param [transaction] - connection to the DB
 * @param [tableSpec] - table schema to generate table with
 */
async function createTable(
  table: string,
  transaction: Knex = db.knex,
  tableSpec: TableDefinition = tables[table]!,
) {
  const collations = await getForeignKeyCollations(tableSpec, transaction);
  return buildTable(table, transaction, tableSpec, collations);
}

/**
 * @param [transaction] - connection to the DB
 */
function deleteTable(table: string, transaction: Knex = db.knex) {
  return transaction.schema.dropTableIfExists(table);
}

/**
 * Create (or replace) a database VIEW.
 *
 * On MySQL the view is created with `SQL SECURITY INVOKER` so it runs with the
 * privileges of the querying user rather than binding to the DEFINER account
 * of whoever happened to run the migration. A DEFINER-bound view breaks when
 * the database is restored under a different MySQL user (Ghost(Pro) restores,
 * self-host server moves) — the view errors at query time because the original
 * account does not exist on the target — and it leaks the internal account name
 * into every mysqldump. INVOKER avoids both problems.
 *
 * SQLite has no DEFINER / SQL SECURITY concept, so the plain knex builder is
 * used there (tests and local dev).
 *
 * All view creation — both `knex-migrator init` and versioned migrations —
 * should go through this helper so every view is portable by default.
 *
 * @param name - the view name
 * @param viewSql - the raw SELECT body (everything after `AS`)
 * @param [transaction] - connection to the DB
 */
async function createViewOrReplace(name: string, viewSql: string, transaction: Knex = db.knex) {
  if (DatabaseInfo.isMySQL(transaction)) {
    await transaction.raw(`CREATE OR REPLACE SQL SECURITY INVOKER VIEW \`${name}\` AS ${viewSql}`);
    return;
  }

  await transaction.schema.createViewOrReplace(name, function (view) {
    view.as(transaction.raw(viewSql) as unknown as Knex.QueryBuilder);
  });
}

/**
 * @param [transaction] - connection to the DB
 */
async function getTables(transaction: Knex = db.knex): Promise<string[]> {
  const client = transaction.client.config.client;

  if (DatabaseInfo.isSQLite(transaction)) {
    const response = await transaction.raw("select * from sqlite_master where type = 'table'");
    return _.reject(_.map(response, 'tbl_name'), (name) => name === 'sqlite_sequence');
  } else if (client === 'mysql2') {
    const response = await transaction.raw("show full tables where Table_type = 'BASE TABLE'");
    return _.map(response[0], (entry) => _.values(entry)[0]);
  }

  return Promise.reject(tpl(messages.noSupportForDatabase, { client: client }));
}

/**
 * @param [transaction] - connection to the DB
 */
async function getIndexes(table: string, transaction: Knex = db.knex): Promise<string[]> {
  const client = transaction.client.config.client;

  if (DatabaseInfo.isSQLite(transaction)) {
    const response = await transaction.raw(`pragma index_list("${table}")`);
    return _.flatten(_.map(response, 'name'));
  } else if (client === 'mysql2') {
    const response = await transaction.raw(`SHOW INDEXES from ${table}`);
    return _.flatten(_.map(response[0], 'Key_name'));
  }

  return Promise.reject(tpl(messages.noSupportForDatabase, { client: client }));
}

/**
 * @param [transaction] - connection to the DB
 */
async function getColumns(table: string, transaction: Knex = db.knex): Promise<string[]> {
  if (DatabaseInfo.isSQLite(transaction)) {
    const response = await transaction.raw(`pragma table_info("${table}")`);
    return _.flatten(_.map(response, 'name'));
  } else if (DatabaseInfo.isMySQL(transaction)) {
    const response = await transaction.raw(`SHOW COLUMNS from ${table}`);
    return _.flatten(_.map(response[0], 'Field'));
  }

  return Promise.reject(
    tpl(messages.noSupportForDatabase, { client: transaction.client.config.client }),
  );
}

export type ColumnMigration = {
  table: string;
  column: string;
  dbIsInCorrectState: (hasColumn: boolean) => boolean;
  operation: (
    table: string,
    column: string,
    conn: Knex,
    columnDefinition: ColumnDefinition,
    options?: ColumnMigrationOptions,
  ) => Promise<unknown>;
  operationVerb: string;
  columnDefinition: ColumnDefinition;
  options?: ColumnMigrationOptions;
};

function createColumnMigration(...migrations: ColumnMigration[]) {
  async function runColumnMigration(conn: Knex, migration: ColumnMigration) {
    const {
      table,
      column,
      dbIsInCorrectState,
      operation,
      operationVerb,
      columnDefinition,
      options,
    } = migration;

    const hasColumn = await conn.schema.hasColumn(table, column);
    const isInCorrectState = dbIsInCorrectState(hasColumn);

    if (isInCorrectState) {
      logging.warn(`${operationVerb} ${table}.${column} column - skipping as table is correct`);
    } else {
      logging.info(`${operationVerb} ${table}.${column} column`);
      await operation(table, column, conn, columnDefinition, options);
    }
  }

  return async function columnMigration(conn: Knex) {
    for (const migration of migrations) {
      await runColumnMigration(conn, migration);
    }
  };
}

export {
  createTable,
  deleteTable,
  createViewOrReplace,
  getTables,
  getIndexes,
  addUnique,
  dropUnique,
  addIndex,
  dropIndex,
  addPrimaryKey,
  addForeign,
  dropForeign,
  addColumn,
  renameColumn,
  dropColumn,
  setNullable,
  dropNullable,
  getColumns,
  createColumnMigration,
  // NOTE: below are exposed for testing purposes only
  buildTable as _buildTable,
  getForeignKeyCollations as _getForeignKeyCollations,
  hasForeignSQLite as _hasForeignSQLite,
  hasPrimaryKeySQLite as _hasPrimaryKeySQLite,
};
