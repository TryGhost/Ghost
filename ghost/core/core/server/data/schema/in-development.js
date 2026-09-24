const logging = require('@tryghost/logging');
const config = require('../../../shared/config');
const schema = require('./schema');

/**
 * Tables listed here are defined in `schema.js` but are still being iterated on.
 *
 * - `knex-migrator init` only creates them when `createInDevelopmentTables` is
 *   enabled in config (development and testing environments by default), so
 *   production databases never contain them.
 * - Boot creates any that are missing from an existing development database.
 * - They need no versioned migration and are left out of the schema integrity
 *   hash, so their definition can change freely.
 *
 * Once a table's definition is final, remove it from this list and add the
 * versioned migration that creates it.
 *
 * Code that reads or writes these tables must only run behind a feature flag
 * that is off wherever the tables are not created.
 *
 * @type {string[]}
 */
const IN_DEVELOPMENT_TABLES = [];

/**
 * @param {string} tableName
 * @returns {boolean}
 */
function isInDevelopmentTable(tableName) {
  return IN_DEVELOPMENT_TABLES.includes(tableName);
}

/**
 * @returns {boolean}
 */
function shouldCreateInDevelopmentTables() {
  return config.get('createInDevelopmentTables') === true;
}

/**
 * The in-development tables in `schema.js` order, which is dependency order
 *
 * @returns {string[]}
 */
function getInDevelopmentTables() {
  return Object.keys(schema).filter(isInDevelopmentTable);
}

/**
 * The tables `knex-migrator init` should create in the current environment
 *
 * @returns {string[]}
 */
function getTablesToCreate() {
  const includeInDevelopment = shouldCreateInDevelopmentTables();
  return Object.keys(schema).filter(
    (tableName) => includeInDevelopment || !isInDevelopmentTable(tableName),
  );
}

/**
 * Creates in-development tables missing from an already initialised database
 *
 * @param {import('knex').Knex} [knex] - defaults to Ghost's connection
 */
async function createMissingInDevelopmentTables(knex) {
  if (!shouldCreateInDevelopmentTables()) {
    return;
  }

  const tables = getInDevelopmentTables();
  if (!tables.length) {
    return;
  }

  // Required lazily so listing tables never opens a database connection
  const commands = require('./commands');
  knex = knex || require('../db').knex;
  const existingTables = await commands.getTables(knex);

  for (const tableName of tables) {
    if (!existingTables.includes(tableName)) {
      logging.info(`Creating in-development table: ${tableName}`);
      await commands.createTable(tableName, knex);
    }
  }
}

/**
 * Drops and recreates every in-development table, discarding its data, so the
 * database picks up changes to their definitions in `schema.js`
 *
 * @param {import('knex').Knex} [knex] - defaults to Ghost's connection
 */
async function rebuildInDevelopmentTables(knex) {
  if (!shouldCreateInDevelopmentTables()) {
    logging.warn(
      'In-development tables are disabled in this environment (createInDevelopmentTables)',
    );
    return;
  }

  const commands = require('./commands');
  knex = knex || require('../db').knex;
  const tables = getInDevelopmentTables();

  for (const tableName of [...tables].reverse()) {
    logging.info(`Dropping in-development table: ${tableName}`);
    await commands.deleteTable(tableName, knex);
  }

  for (const tableName of tables) {
    logging.info(`Creating in-development table: ${tableName}`);
    await commands.createTable(tableName, knex);
  }
}

module.exports = {
  IN_DEVELOPMENT_TABLES,
  isInDevelopmentTable,
  shouldCreateInDevelopmentTables,
  getInDevelopmentTables,
  getTablesToCreate,
  createMissingInDevelopmentTables,
  rebuildInDevelopmentTables,
};
