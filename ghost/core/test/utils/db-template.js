const debug = require('@tryghost/debug')('test:dbTemplate');
const path = require('path');
const knex = require('knex');
const KnexMigrator = require('knex-migrator');
const {sequence} = require('@tryghost/promise');

const config = require('../../core/shared/config');
const db = require('../../core/server/data/db');
const schemaModule = require('../../core/server/data/schema');
const schemaTables = Object.keys(schemaModule.tables);
const schemaViews = schemaModule.views || {};
const {deriveMySQLTemplateDatabase} = require('./db-template-paths');

// A migrated + seeded database is expensive to build (full knex-migrator init:
// create every table, record all ~120 versioned migrations as applied, and
// insert every default fixture). On MySQL each step is a network round-trip, and
// the DB-suite runner's `isolate:true` projects run every test FILE in a fresh
// fork, so without help each file pays that full init once — the bulk of the
// MySQL acceptance-test runtime regression (PLA-165).
//
// Instead we build ONE migrated + seeded "template" database for the whole run
// (in the vitest globalSetup, before any fork spawns) and have each fork RESTORE
// from it when it first provisions its per-process DB, replacing the migrate+seed
// with a cheap same-server bulk copy (`CREATE TABLE ... LIKE` + `INSERT ...
// SELECT`).
//
// MySQL only. sqlite's per-file init is cheap (~0.65s, not the bottleneck), and a
// sqlite restore would copy the template file over a fork's already-open
// connection — which destabilizes read order for order-dependent tests — so
// sqlite keeps a plain per-file init.
//
// Readiness is published from globalSetup to the forks via an env var (forks
// inherit the main process env at spawn time). When it is unset — e.g.
// `test:single` on one file with no globalSetup — the callers fall back to a full
// knex-migrator init, so behaviour is unchanged outside the orchestrated run.
//
// SCOPE: only the db.reset() provisioning path (agentProvider-based e2e / e2e-api
// / e2e-* suites, the dominant MySQL cost) uses this. The getFixtureOps
// `testUtils.setup()` path (integration/legacy) opens Ghost's bookshelf
// connection BEFORE provisioning, so that path still does a full init. See the
// PLA-165 notes for the deferred follow-up.

const TEMPLATE_ENV_VAR = 'GHOST_TEST_DB_TEMPLATE_READY';

const getResetTables = () => {
    return schemaTables.concat(['migrations']);
};

// Client detection from config (NOT db.knex) for the build/teardown paths, which
// run in globalSetup where touching db.knex would bind Ghost's singleton
// connection to a template location.
const configuredClientIsSQLite = () => config.get('database:client') === 'sqlite3';

/**
 * Whether the shared template has been built for this run (published by
 * globalSetup). Callers use this to choose a cheap restore over a full init.
 * Always false on sqlite — no template is built there.
 * @returns {boolean}
 */
const hasTemplate = () => {
    return process.env[TEMPLATE_ENV_VAR] === '1';
};

/**
 * Resolve the template database name from the CURRENT fork connection's config.
 * config holds the suffixed per-fork value; the pure deriver strips that suffix
 * so this resolves to the same template globalSetup built from the un-suffixed
 * base.
 * @returns {string}
 */
const getForkTemplateDatabase = () => {
    return deriveMySQLTemplateDatabase(config.get('database:connection:database'));
};

/**
 * Create the fork's per-process mysql database if it does not exist, via a
 * short-lived connection with no default database (Ghost's db.knex is bound to
 * the not-yet-existing fork DB, so it cannot do this itself). Mirrors
 * knex-migrator's createDatabaseIfNotExist.
 */
const ensureForkDatabaseExists = async () => {
    const connectionConfig = config.get('database:connection');
    const {database, ...connectionWithoutDb} = connectionConfig;
    const admin = knex({
        client: config.get('database:client'),
        connection: connectionWithoutDb
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
 * before any fork). MySQL only. Derives the template location from the run's BASE
 * (un-suffixed) DB identifier, points Ghost's config there, then runs a full
 * knex-migrator reset + init. A fresh KnexMigrator is constructed AFTER the config
 * override so it reads the template location via MigratorConfig.js.
 *
 * @param {{mysqlBase?: string}} base the run's base DB identifier, un-suffixed
 */
const buildTemplate = async (base) => {
    // The template is MySQL-only. sqlite's per-file init is cheap (~0.65s), and
    // restoring it by copying the template file over a fork's already-open
    // connection destabilizes read order for order-dependent tests (PLA-165) — so
    // sqlite does a plain per-file init and hasTemplate() stays false here.
    if (configuredClientIsSQLite()) {
        debug('sqlite: skipping shared template');
        return;
    }

    debug('Building shared DB template');
    config.set('database:connection:database', deriveMySQLTemplateDatabase(base.mysqlBase));

    // Construct after the override so MigratorConfig.js captures the template
    // location. reset({force}) drops the template DB (DROP DATABASE, tolerating
    // "does not exist"); init recreates, migrates, and seeds — exactly db-utils'
    // forceReinit.
    const knexMigrator = new KnexMigrator({knexMigratorFilePath: path.join(__dirname, '../..')});
    await knexMigrator.reset({force: true});
    await knexMigrator.init();

    process.env[TEMPLATE_ENV_VAR] = '1';
    debug('Shared DB template ready');
};

/**
 * Restore the current fork's per-process database from the shared template.
 * Assumes the caller has verified hasTemplate(). Copies every table from the
 * template DB into the fork DB on the same server (replay the template's exact
 * CREATE TABLE DDL + INSERT ... SELECT). The fork's connection is bound to its
 * own database, so the template is referenced by qualified name.
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
    // This makes the restore byte-faithful to a fresh init (PLA-165).
    await db.knex.raw('SET FOREIGN_KEY_CHECKS=0;');
    try {
        await sequence(tables.map(table => async () => {
            const [[{'Create Table': createTableSql}]] = await db.knex.raw('SHOW CREATE TABLE ??.??', [templateDb, table]);
            await db.knex.schema.dropTableIfExists(table);
            await db.knex.raw(createTableSql);
            await db.knex.raw('INSERT INTO ?? SELECT * FROM ??.??', [table, templateDb, table]);
        }));
    } finally {
        await db.knex.raw('SET FOREIGN_KEY_CHECKS=1;');
    }

    // The table copy above only covers base tables; views are not in
    // getResetTables (the existing snapshot path relies on init() having created
    // them once). Recreate them here from the schema definitions, exactly as
    // migrations/init/1-create-tables.js does, so a template-provisioned fork DB
    // has the same views as a fully-migrated one.
    for (const [name, sql] of Object.entries(schemaViews)) {
        await db.knex.schema.createViewOrReplace(name, function (view) {
            view.as(db.knex.raw(sql));
        });
    }
};

/**
 * Drop the shared template database. Called from globalSetup teardown. MySQL only
 * (no-op on sqlite). Best effort — on CI the whole server is ephemeral; this is
 * for local hygiene and to avoid a stale template surviving into the next run.
 *
 * @param {{mysqlBase?: string}} base the run's base DB id
 */
const dropTemplate = async (base) => {
    if (configuredClientIsSQLite()) {
        return;
    }
    try {
        // Point config at the template and let knex-migrator reset({force}) drop
        // that database — reusing the same connection path build used, so we never
        // bind Ghost's singleton db.knex to a template.
        config.set('database:connection:database', deriveMySQLTemplateDatabase(base.mysqlBase));
        const knexMigrator = new KnexMigrator({knexMigratorFilePath: path.join(__dirname, '../..')});
        await knexMigrator.reset({force: true});
    } catch (err) {
        debug(`Failed to drop template (ignored): ${err.message}`);
    }
};

module.exports = {
    TEMPLATE_ENV_VAR,
    deriveMySQLTemplateDatabase,
    configuredClientIsSQLite,
    hasTemplate,
    buildTemplate,
    restoreFromTemplate,
    dropTemplate
};
