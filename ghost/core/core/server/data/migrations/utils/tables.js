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
 * Runs `fn` with foreign key checks off, so a table other tables reference can
 * be dropped and recreated
 *
 * @param {import('knex').Knex} connection
 * @param {(connection: import('knex').Knex) => Promise<void>} fn
 */
async function withoutForeignKeyChecks(connection, fn) {
  if (DatabaseInfo.isMySQL(connection)) {
    // The setting is per session, so the transaction pins one connection
    await connection.transaction(async (transaction) => {
      await transaction.raw('SET FOREIGN_KEY_CHECKS = 0');
      try {
        await fn(transaction);
      } finally {
        await transaction.raw('SET FOREIGN_KEY_CHECKS = 1');
      }
    });
    return;
  }

  // SQLite uses a single connection, and ignores this pragma inside a transaction
  await connection.raw('PRAGMA foreign_keys = OFF');
  try {
    await fn(connection);
  } finally {
    await connection.raw('PRAGMA foreign_keys = ON');
  }
}

/**
 * Creates a migrations which will add a new table from schema.js to the database
 * @param {string} name - table name
 * @param {Object} tableSpec - copy of table schema definition as defined in schema.js at the moment of writing the migration, this parameter MUST be present
 * @param {Object} [options]
 * @param {boolean} [options.replaceDevelopmentCopy] - set when finalising a table that was in development (see
 *   schema/in-development.ts). Development and testing databases already have a copy built from an earlier
 *   definition, so there an existing table is replaced, discarding its data. Other environments skip it as usual.
 *
 * @returns {Object} migration object returning config/up/down properties
 */
function addTable(name, tableSpec, { replaceDevelopmentCopy = false } = {}) {
  return createNonTransactionalMigration(
    async function up(connection) {
      const tableExists = await connection.schema.hasTable(name);
      if (tableExists && replaceDevelopmentCopy && isDevelopmentOrTesting()) {
        logging.info(`Replacing development copy of table: ${name}`);
        return withoutForeignKeyChecks(connection, async (knex) => {
          await commands.deleteTable(name, knex);
          await commands.createTable(name, knex, tableSpec);
        });
      }

      if (tableExists) {
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
