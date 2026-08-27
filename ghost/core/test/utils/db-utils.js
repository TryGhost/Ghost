const debug = require('@tryghost/debug')('test:dbUtils');

// Utility Packages
const path = require('path');
const KnexMigrator = require('knex-migrator');
// Resolve MigratorConfig.js from the package root explicitly rather than via
// process.cwd(): the unified `pnpm test:watch` runs from the repo root, and
// worker threads cannot chdir. From ghost/core this is the same path, so it
// is a no-op for the standalone mocha/vitest runs.
const knexMigrator = new KnexMigrator({ knexMigratorFilePath: path.join(__dirname, '../..') });

// Ghost Internals
const config = require('../../core/shared/config');
const db = require('../../core/server/data/db');
const schema = require('../../core/server/data/schema').tables;
const schemaTables = Object.keys(schema);

// Other Test Utilities
const urlServiceUtils = require('./url-service-utils');
const dbTemplate = require('./db-template');

let mysqlSnapshotDatabase = null;
const mysqlSnapshotTablePrefix = '__ghost_snapshot_';

/**
 * Reset
 * - restores the DB to a fresh state with the default fixtures in place
 * - has many behind the scenes tricks to try to do this as fast as possible
 *
 * @param {Object} options
 * @param {boolean} options.truncate whether to truncate rather thann fully reset
 */
module.exports.reset = async ({ truncate } = { truncate: false }) => {
  if (truncate) {
    // Perform a fast reset by tearing down all the tables and inserting the fixtures
    try {
      await resetMySQLFromSnapshot();
    } catch (err) {
      // If it fails, try a normal restore
      await forceReinit();
      await createMySQLSnapshot();
    }
  } else {
    // Do a full database reset + initialisation
    await forceReinit();
  }
};

/**
 * Teardown
 * - restores the DB to empty tables only - no default fixtures, settings or permissions
 * - has behind the scenes tricks to try to do this as fast as possible
 */
module.exports.teardown = async () => {
  try {
    await truncateAll();
  } catch (err) {
    await knexMigrator.reset({ force: true });
  }

  await dropMySQLSnapshots();
};

/**
 * Truncate
 * - truncate a single table
 * @param {string} tableName - the table to truncate
 */
module.exports.truncate = async (tableName) => {
  await db.knex.raw('SET FOREIGN_KEY_CHECKS=0;');
  await db.knex(tableName).truncate();
  await db.knex.raw('SET FOREIGN_KEY_CHECKS=1;');
};

/**
 * Internal helper to do a safe-but-slow knex-based forced reinit of the DB.
 */
const forceReinit = async () => {
  await knexMigrator.reset({ force: true });
  await knexMigrator.init();
  await dropMySQLSnapshots();
};

const getResetTables = () => {
  return schemaTables.concat(['migrations']);
};

const getMySQLSnapshotTableName = (table) => {
  return `${mysqlSnapshotTablePrefix}${table}`;
};

const getMySQLDatabaseName = () => {
  return config.get('database:connection:database');
};

const isMySQLSnapshotCurrent = () => {
  return mysqlSnapshotDatabase === getMySQLDatabaseName();
};

const resetMySQLFromSnapshot = async () => {
  if (!isMySQLSnapshotCurrent()) {
    // First provision in this fork: load the schema + fixtures from the run's
    // shared template, then build snapshot tables for later in-fork resets.
    await dbTemplate.restoreFromTemplate();
    await createMySQLSnapshot();
    return;
  }

  await restoreMySQLSnapshot();
};

const createMySQLSnapshot = async () => {
  const tables = getResetTables();

  for (const table of tables) {
    const snapshotTable = getMySQLSnapshotTableName(table);

    await db.knex.schema.dropTableIfExists(snapshotTable);
    await db.knex.raw('CREATE TABLE ?? LIKE ??', [snapshotTable, table]);
    await db.knex.raw('INSERT INTO ?? SELECT * FROM ??', [snapshotTable, table]);
  }

  mysqlSnapshotDatabase = getMySQLDatabaseName();
};

const restoreMySQLSnapshot = async () => {
  debug('Database snapshot restore');

  const tables = getResetTables();

  await db.knex.transaction(async (trx) => {
    try {
      await db.knex.raw('SET FOREIGN_KEY_CHECKS=0;').transacting(trx);

      for (const table of tables) {
        const snapshotTable = getMySQLSnapshotTableName(table);

        await db.knex.raw('DELETE FROM ??', [table]).transacting(trx);
        await db.knex
          .raw('INSERT INTO ?? SELECT * FROM ??', [table, snapshotTable])
          .transacting(trx);
      }
    } finally {
      await db.knex.raw('SET FOREIGN_KEY_CHECKS=1;').transacting(trx);
      debug('Database snapshot restore end');
    }
  });
};

const dropMySQLSnapshots = async () => {
  mysqlSnapshotDatabase = null;

  try {
    for (const table of getResetTables()) {
      await db.knex.schema.dropTableIfExists(getMySQLSnapshotTableName(table));
    }
  } catch (err) {
    // CASE: table does not exist || DB does not exist
    if (err.errno === 1146 || err.errno === 1049) {
      return Promise.resolve();
    }

    throw err;
  }
};

/**
 * Internal helper to attempt to truncate all tables as fast as possible
 * Has to run in a transaction, otherwise the foreign key check does not work.
 */
const truncateAll = async () => {
  debug('Database teardown');

  const tables = getResetTables();

  await db.knex.transaction(async (trx) => {
    try {
      await db.knex.raw('SET FOREIGN_KEY_CHECKS=0;').transacting(trx);
      for (const table of tables) {
        await db.knex.raw('DELETE FROM ' + table + ';').transacting(trx);
      }
      await db.knex.raw('SET FOREIGN_KEY_CHECKS=1;').transacting(trx);
    } catch (err) {
      // CASE: table does not exist || DB does not exist
      // If the table or DB are not present, we can safely ignore
      if (err.errno === 1146 || err.errno === 1049) {
        return Promise.resolve();
      }

      throw err;
    } finally {
      debug('Database teardown end');
    }
  });
};

/**
 * @deprecated Use reset instead
 * Old method for clearing data from the database that also mixes in url service behavior
 */
module.exports.initData = async () => {
  await knexMigrator.init();
  await urlServiceUtils.isFinished();
};

module.exports.knex = db.knex;
