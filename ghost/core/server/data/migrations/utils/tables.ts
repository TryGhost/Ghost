import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import type { Knex } from 'knex';
import config from '../../../../shared/config';
import {
  createIrreversibleMigration,
  createNonTransactionalMigration,
  type Migration,
  type MigrationFunction,
} from './migrations';

const DatabaseInfo = require('@tryghost/database-info');
const { commands } = require('../../schema');

type TableSpec = Record<string, unknown>;

function isDevelopmentOrTesting() {
  const env = config.get('env');
  return env === 'development' || env.startsWith('testing');
}

/**
 * @returns the other tables with a foreign key to `table`
 */
async function getReferencingTables(connection: Knex, table: string): Promise<string[]> {
  if (DatabaseInfo.isMySQL(connection)) {
    const [rows] = await connection.raw(
      `SELECT DISTINCT TABLE_NAME AS name
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME = ?
        AND TABLE_NAME <> ?`,
      [table, table],
    );
    return rows.map((row: { name: string }) => row.name);
  }

  const referencing: string[] = [];
  for (const other of await commands.getTables(connection)) {
    if (other === table) {
      continue;
    }
    const foreignKeys = await connection.raw(`PRAGMA foreign_key_list('${other}');`);
    if (foreignKeys.some((foreignKey: { table: string }) => foreignKey.table === table)) {
      referencing.push(other);
    }
  }
  return referencing;
}

/**
 * Drops a development copy of a table along with the tables that reference it,
 * so no rows are left pointing at a table that no longer exists. Boot recreates
 * the dropped tables that are still in development.
 */
async function dropDevelopmentCopy(
  connection: Knex,
  table: string,
  dropped: Set<string> = new Set(),
): Promise<void> {
  dropped.add(table);
  for (const referencing of await getReferencingTables(connection, table)) {
    if (!dropped.has(referencing)) {
      await dropDevelopmentCopy(connection, referencing, dropped);
    }
  }

  logging.info(`Dropping development copy of table: ${table}`);
  await commands.deleteTable(table, connection);
}

/**
 * Creates a migrations which will add a new table from schema.js to the database
 * @param name - table name
 * @param tableSpec - copy of table schema definition as defined in schema.js at the moment of writing the migration, this parameter MUST be present
 * @param options.replaceDevelopmentCopy - set when finalising a table that was in development (see
 *   schema/in-development.ts). Development and testing databases already have a copy built from an earlier
 *   definition, so there an existing table is replaced, discarding its data and dropping the tables that reference
 *   it. Other environments skip it as usual.
 */
export function addTable(
  name: string,
  tableSpec: TableSpec,
  { replaceDevelopmentCopy = false }: { replaceDevelopmentCopy?: boolean } = {},
): Migration {
  return createNonTransactionalMigration(
    async function up(connection) {
      const tableExists = await connection.schema.hasTable(name);
      if (tableExists && replaceDevelopmentCopy && isDevelopmentOrTesting()) {
        await dropDevelopmentCopy(connection, name);
      } else if (tableExists) {
        logging.warn(`Skipping adding table: ${name} - table already exists`);
        return;
      }

      logging.info(`Adding table: ${name}`);
      return commands.createTable(name, connection, tableSpec);
    },
    async function down(connection) {
      const tableExists = await connection.schema.hasTable(name);
      if (!tableExists) {
        logging.warn(`Skipping dropping table: ${name} - table does not exist`);
        return;
      }

      if (replaceDevelopmentCopy && isDevelopmentOrTesting()) {
        return dropDevelopmentCopy(connection, name);
      }

      logging.info(`Dropping table: ${name}`);
      return commands.deleteTable(name, connection);
    },
  );
}

/**
 * Creates migration which will drop tables
 *
 * Without `tableSpecs` the migration is irreversible: a dropped table's rows are gone, so
 * rolling back would hand an earlier version an empty table it expects data in. Passing a
 * spec for every table makes it reversible, recreating the tables empty and in reverse
 * order. Only do that for tables whose rows can be lost, such as ones behind a private
 * feature flag.
 *
 * @param names - names of the tables to drop, each before any table it references
 * @param tableSpecs - copy of each table's schema definition as defined in schema.js at the moment of writing the migration, keyed by table name
 */
export function dropTables(names: string[], tableSpecs?: Record<string, TableSpec>): Migration {
  const up: MigrationFunction = async function up(connection) {
    for (const name of names) {
      const exists = await connection.schema.hasTable(name);

      if (!exists) {
        logging.warn(`Skipping dropping table: ${name} - table does not exist`);
      } else {
        logging.info(`Dropping table: ${name}`);
        await commands.deleteTable(name, connection);
      }
    }
  };

  if (!tableSpecs) {
    return createIrreversibleMigration(up);
  }

  const missingSpecs = names.filter((name) => !Object.hasOwn(tableSpecs, name));
  if (missingSpecs.length) {
    throw new errors.IncorrectUsageError({
      message: `Cannot recreate dropped tables without their specs: ${missingSpecs.join(', ')}`,
    });
  }

  return createNonTransactionalMigration(up, async function down(connection) {
    for (const name of names.toReversed()) {
      const exists = await connection.schema.hasTable(name);

      if (exists) {
        logging.warn(`Skipping adding table: ${name} - table already exists`);
      } else {
        logging.info(`Adding table: ${name}`);
        await commands.createTable(name, connection, tableSpecs[name]);
      }
    }
  });
}

/**
 * Creates a migration which will drop an existing table and then re-add a new table based on provided spec
 * @param name - table name
 * @param tableSpec - copy of table schema definition as defined in schema.js at the moment of writing the migration, this parameter MUST be present
 */
export function recreateTable(name: string, tableSpec: TableSpec): Migration {
  return createNonTransactionalMigration(
    async function up(connection) {
      const exists = await connection.schema.hasTable(name);

      if (!exists) {
        logging.warn(`Skipping dropping table: ${name} - table does not exist`);
      } else {
        logging.info(`Dropping table: ${name}`);
        await commands.deleteTable(name, connection);
        logging.info(`Re-adding table: ${name}`);
        await commands.createTable(name, connection, tableSpec);
      }
    },
    async function down() {
      // noop: we cannot go back to old table schema
      logging.warn(`Ignoring rollback for table recreate: ${name}`);
      return Promise.resolve();
    },
  );
}
