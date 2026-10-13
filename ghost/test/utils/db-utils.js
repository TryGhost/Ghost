const debug = require('@tryghost/debug')('test:dbUtils');

// Utility Packages
const path = require('path');
const KnexMigrator = require('knex-migrator');
// Resolve MigratorConfig.js from the package root explicitly rather than via
// process.cwd(): the unified `pnpm test:watch` runs from the repo root, and
// worker threads cannot chdir. From ghost this is the same path, so it
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

let templateRestoredDatabase = null;

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
      await resetMySQLFromTemplate();
    } catch (err) {
      // If it fails, try a normal restore
      await forceReinit();
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
    await forceReinit();
    await truncateAll();
  }
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
 * Internal helper to drop the DB and recreate it from the run's template.
 */
const forceReinit = async () => {
  templateRestoredDatabase = null;
  await knexMigrator.reset({ force: true });
  await dbTemplate.restoreFromTemplate();
  templateRestoredDatabase = getMySQLDatabaseName();
};

const getResetTables = () => {
  return schemaTables.concat(['migrations']);
};

const getMySQLDatabaseName = () => {
  return config.get('database:connection:database');
};

const resetMySQLFromTemplate = async () => {
  if (templateRestoredDatabase !== getMySQLDatabaseName()) {
    await forceReinit();
    return;
  }

  await restoreTemplateRows();
};

const restoreTemplateRows = async () => {
  debug('Database template rows restore');

  const tables = getResetTables();
  const templateDb = dbTemplate.getForkTemplateDatabase();

  await db.knex.transaction(async (trx) => {
    try {
      await db.knex.raw('SET FOREIGN_KEY_CHECKS=0;').transacting(trx);

      for (const table of tables) {
        await db.knex.raw('DELETE FROM ??', [table]).transacting(trx);
        await db.knex
          .raw('INSERT INTO ?? SELECT * FROM ??.??', [table, templateDb, table])
          .transacting(trx);
      }
    } finally {
      await db.knex.raw('SET FOREIGN_KEY_CHECKS=1;').transacting(trx);
      debug('Database template rows restore end');
    }
  });
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
