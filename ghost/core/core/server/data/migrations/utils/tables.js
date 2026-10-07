const logging = require('@tryghost/logging');
const DatabaseInfo = require('@tryghost/database-info');
const config = require('../../../../shared/config');
const { commands } = require('../../schema');
const { createIrreversibleMigration, createNonTransactionalMigration } = require('./migrations');

function isDevelopmentOrTesting() {
  const env = config.get('env');
  return env === 'development' || env.startsWith('testing');
}

/**
 * @param {import('knex').Knex} connection
 * @param {string} table
 * @returns {Promise<string[]>} the other tables with a foreign key to `table`
 */
async function getReferencingTables(connection, table) {
  if (DatabaseInfo.isMySQL(connection)) {
    const [rows] = await connection.raw(
      `SELECT DISTINCT TABLE_NAME AS name
        FROM information_schema.KEY_COLUMN_USAGE
        WHERE REFERENCED_TABLE_SCHEMA = DATABASE()
        AND REFERENCED_TABLE_NAME = ?
        AND TABLE_NAME <> ?`,
      [table, table],
    );
    return rows.map((/** @type {{name: string}} */ row) => row.name);
  }

  const referencing = [];
  for (const other of await commands.getTables(connection)) {
    if (other === table) {
      continue;
    }
    const foreignKeys = await connection.raw(`PRAGMA foreign_key_list('${other}');`);
    if (
      foreignKeys.some((/** @type {{table: string}} */ foreignKey) => foreignKey.table === table)
    ) {
      referencing.push(other);
    }
  }
  return referencing;
}

/**
 * Drops a development copy of a table along with the tables that reference it,
 * so no rows are left pointing at a table that no longer exists. Boot recreates
 * the dropped tables that are still in development.
 *
 * @param {import('knex').Knex} connection
 * @param {string} table
 * @param {Set<string>} [dropped]
 */
async function dropDevelopmentCopy(connection, table, dropped = new Set()) {
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
 * @param {string} name - table name
 * @param {Object} tableSpec - copy of table schema definition as defined in schema.js at the moment of writing the migration, this parameter MUST be present
 * @param {Object} [options]
 * @param {boolean} [options.replaceDevelopmentCopy] - set when finalising a table that was in development (see
 *   schema/in-development.ts). Development and testing databases already have a copy built from an earlier
 *   definition, so there an existing table is replaced, discarding its data and dropping the tables that reference
 *   it. Other environments skip it as usual.
 *
 * @returns {Object} migration object returning config/up/down properties
 */
function addTable(name, tableSpec, { replaceDevelopmentCopy = false } = {}) {
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
 * Creates migration which will drop a table
 *
 * @param {string[]} names  - names of the tables to drop
 */
function dropTables(names) {
  return createIrreversibleMigration(async function up(connection) {
    for (const name of names) {
      const exists = await connection.schema.hasTable(name);

      if (!exists) {
        logging.warn(`Skipping dropping table: ${name} - table does not exist`);
      } else {
        logging.info(`Dropping table: ${name}`);
        await commands.deleteTable(name, connection);
      }
    }
  });
}

/**
 * Creates a migration which will drop an existing table and then re-add a new table based on provided spec
 * @param {string} name - table name
 * @param {Object} tableSpec - copy of table schema definition as defined in schema.js at the moment of writing the migration, this parameter MUST be present
 *
 * @returns {Object} migration object returning config/up/down properties
 */
function recreateTable(name, tableSpec) {
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

module.exports = {
  addTable,
  dropTables,
  recreateTable,
};
