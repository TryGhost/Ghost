const debug = require('@tryghost/debug')('test:dbTemplate');
const path = require('path');
const knex = require('knex');
const KnexMigrator = require('knex-migrator');

const config = require('../../core/shared/config');
const db = require('../../core/server/data/db');
const schemaModule = require('../../core/server/data/schema');
const schemaTables = Object.keys(schemaModule.tables);
const schemaViews = schemaModule.views || {};

// A migrated + seeded database is expensive to build (full knex-migrator init:
// create every table, record all ~120 versioned migrations as applied, and
// insert every default fixture). On MySQL each step is a network round-trip. The
// DB-suite runner's `isolate:true` projects run every test FILE in a fresh fork,
// so without help each file pays that full init once — the bulk of the
// acceptance-test runtime regression.
//
// Instead we build ONE migrated + seeded "template" database for the whole run
// (in the vitest globalSetup, before any fork spawns) and have each fork RESTORE
// from it when it first provisions its per-process DB, replacing the migrate+seed
// with a cheap bulk copy.
//
// MySQL restores via a same-server `SHOW CREATE TABLE` + `INSERT ... SELECT`.
//
// SCOPE: only the db.reset() provisioning path (agentProvider-based e2e / e2e-api
// / e2e-* suites) uses this. The getFixtureOps `testUtils.setup()` path
// (integration/legacy) opens Ghost's bookshelf connection BEFORE provisioning, so
// that path still does a full init — those suites run isolate:true (a fresh
// process per file), so the per-file boot, not provisioning, is their cost.

const getResetTables = () => {
  return schemaTables.concat(['migrations']);
};

const deriveMySQLTemplateDatabase = (database, runId) => {
  return `${database}_${runId}_template`;
};

/**
 * Resolve the template database name for the current run.
 * globalSetup publishes the unsuffixed base before workers spawn, so every fork
 * resolves the same template database.
 * @returns {string}
 */
const getForkTemplateDatabase = () => {
  return deriveMySQLTemplateDatabase(
    process.env.GHOST_TEST_DB_BASE,
    process.env.GHOST_TEST_DB_RUN_ID,
  );
};

/**
 * Create the fork's per-process mysql database if it does not exist, via a
 * short-lived connection with no default database (Ghost's db.knex is bound to
 * the not-yet-existing fork DB, so it cannot do this itself). Mirrors
 * knex-migrator's createDatabaseIfNotExist.
 */
const ensureForkDatabaseExists = async () => {
  const connectionConfig = config.get('database:connection');
  const { database, ...connectionWithoutDb } = connectionConfig;
  const admin = knex({
    client: config.get('database:client'),
    connection: connectionWithoutDb,
  });
  try {
    // CHARACTER SET only (no explicit collation), matching knex-migrator's
    // createDatabaseIfNotExist. Table collations come from the template via
    // the replayed CREATE TABLE DDL, so the DB default here is not load-bearing.
    const charset = connectionConfig.charset || 'utf8mb4';
    await admin.raw('CREATE DATABASE IF NOT EXISTS ?? CHARACTER SET ??', [database, charset]);
  } finally {
    await admin.destroy();
  }
};

/**
 * Build the shared template database. Called ONCE from globalSetup (main process,
 * before any fork). Derives the template location from the run's BASE
 * (un-suffixed) DB identifier, points Ghost's config there, then runs a full
 * knex-migrator reset + init. A fresh KnexMigrator is constructed AFTER the config
 * override so it reads the template location via MigratorConfig.js.
 *
 * @param {{mysqlBase: string}} run the run's base DB identifier
 */
const buildTemplate = async (run) => {
  debug('Building shared DB template');
  config.set('database:connection:database', deriveMySQLTemplateDatabase(run.mysqlBase, run.runId));

  // Construct after the override so MigratorConfig.js captures the template
  // location. reset({force}) drops the template DB (DROP DATABASE, tolerating
  // "does not exist"); init recreates, migrates, and seeds — exactly db-utils'
  // forceReinit.
  const knexMigrator = new KnexMigrator({ knexMigratorFilePath: path.join(__dirname, '../..') });
  await knexMigrator.reset({ force: true });
  await knexMigrator.init();

  debug('Shared DB template ready');
};

/**
 * Restore the current fork's per-process database from the shared template.
 * Copies every table from the template DB into the fork DB by replaying the
 * exact schema and copying its data. The template is referenced by qualified
 * name on the fork's bound connection.
 */
const restoreFromTemplate = async () => {
  const templateDb = getForkTemplateDatabase();
  debug('Restoring fork DB from template');

  const tables = getResetTables();

  // The fork's per-process database does not exist yet on first provision (the
  // non-template path would have it created by knex-migrator init's
  // createDatabaseIfNotExist). db.knex is bound to it, so a query would fail
  // with ER_BAD_DB_ERROR — create it first via a short-lived db-less connection
  // (mirrors knex-migrator's own approach), then run the copy.
  await ensureForkDatabaseExists();

  // Fresh fork DB: create each table from the template and bulk-copy its rows.
  // Foreign key checks are disabled so tables can be loaded in any order (and so
  // a table's FK can reference one created later in the sequence).
  //
  // We replay the template's `SHOW CREATE TABLE` DDL rather than `CREATE TABLE
  // ... LIKE`: LIKE copies columns and indexes but DROPS foreign key constraints
  // (a documented MySQL behaviour), so a LIKE-restored fork loses all ~96 FKs a
  // fresh knex-migrator init creates. That breaks FK-dependent tests — orphaned
  // inserts that should 422 succeed, and `ON DELETE CASCADE` no longer prunes
  // child rows (e.g. deleting members leaves stale members_* events behind),
  // surfacing as extra rows in attribution / activity-feed snapshots. The DDL
  // string is unqualified, so replaying it on the fork's connection creates the
  // table in the fork DB; its FK REFERENCES resolve to the fork's own copies.
  // This makes the restore byte-faithful to a fresh init.
  await db.knex.raw('SET FOREIGN_KEY_CHECKS=0;');
  try {
    for (const table of tables) {
      const [[{ 'Create Table': createTableSql }]] = await db.knex.raw('SHOW CREATE TABLE ??.??', [
        templateDb,
        table,
      ]);
      await db.knex.schema.dropTableIfExists(table);
      await db.knex.raw(createTableSql);
      await db.knex.raw('INSERT INTO ?? SELECT * FROM ??.??', [table, templateDb, table]);
    }
  } finally {
    await db.knex.raw('SET FOREIGN_KEY_CHECKS=1;');
  }

  // The table copy above only covers base tables; views are not in
  // getResetTables (the existing snapshot path relies on init() having created
  // them once). Recreate them here from the schema definitions, exactly as
  // migrations/init/1-create-tables.js does — through commands.createViewOrReplace
  // so the fork's views get the same SQL SECURITY INVOKER as a fully-migrated one
  // (a plain knex createViewOrReplace would default to DEFINER on MySQL).
  for (const [name, sql] of Object.entries(schemaViews)) {
    await schemaModule.commands.createViewOrReplace(name, sql, db.knex);
  }
};

/**
 * Drop the shared template and every worker database for this run. Called from
 * globalSetup teardown after all workers have exited. Best effort so cleanup
 * cannot hide a test failure.
 *
 * @param {{mysqlBase: string, runId: string}} run the run's database identifiers
 */
const dropRunDatabases = async (run) => {
  try {
    // Point config at the template and let knex-migrator reset({force}) drop
    // that database — reusing the same connection path build used, so we never
    // bind Ghost's singleton db.knex to a template.
    config.set(
      'database:connection:database',
      deriveMySQLTemplateDatabase(run.mysqlBase, run.runId),
    );
    const knexMigrator = new KnexMigrator({ knexMigratorFilePath: path.join(__dirname, '../..') });
    await knexMigrator.reset({ force: true });
  } catch (err) {
    debug(`Failed to drop template (ignored): ${err.message}`);
  }

  const connectionConfig = config.get('database:connection');
  const connectionWithoutDb = { ...connectionConfig };
  delete connectionWithoutDb.database;
  const admin = knex({
    client: config.get('database:client'),
    connection: connectionWithoutDb,
  });
  try {
    const [rows] = await admin.raw('SHOW DATABASES');
    const prefix = `${run.mysqlBase}_${run.runId}_`;
    const workerDatabases = rows
      .map((row) => Object.values(row)[0])
      .filter((name) => typeof name === 'string' && name.startsWith(prefix));

    for (const workerDatabase of workerDatabases) {
      await admin.raw('DROP DATABASE IF EXISTS ??', [workerDatabase]);
    }
  } catch (err) {
    debug(`Failed to drop worker databases (ignored): ${err.message}`);
  } finally {
    await admin.destroy();
  }
};

module.exports = {
  buildTemplate,
  restoreFromTemplate,
  dropRunDatabases,
};
