const debug = require('@tryghost/debug')('test:dbTemplate');
const path = require('path');
const fs = require('fs-extra');
const knex = require('knex');
const KnexMigrator = require('knex-migrator');
const {sequence} = require('@tryghost/promise');

const config = require('../../core/shared/config');
const db = require('../../core/server/data/db');
const schemaModule = require('../../core/server/data/schema');
const schemaTables = Object.keys(schemaModule.tables);
const schemaViews = schemaModule.views || {};
const {deriveMySQLTemplateDatabase, deriveSQLiteTemplateFilename} = require('./db-template-paths');

// A migrated + seeded database is expensive to build (full knex-migrator init:
// create every table, record all ~120 versioned migrations as applied, and
// insert every default fixture). On MySQL each step is a network round-trip; on
// sqlite each is a file write. The DB-suite runner's `isolate:true` projects run
// every test FILE in a fresh fork, so without help each file pays that full init
// once — the bulk of the acceptance-test runtime regression.
//
// Instead we build ONE migrated + seeded "template" database for the whole run
// (in the vitest globalSetup, before any fork spawns) and have each fork RESTORE
// from it when it first provisions its per-process DB, replacing the migrate+seed
// with a cheap bulk copy.
//
// MySQL restores via a same-server `SHOW CREATE TABLE` + `INSERT ... SELECT`.
// sqlite restores by ATTACHing the template file to the fork's connection,
// replaying the template's schema from its sqlite_master, and bulk-copying every
// table with `INSERT ... SELECT`. We deliberately do NOT copy the template .db
// file over a fork's open connection — that approach destabilized sqlite read
// order for order-dependent tests and was reverted; building the fork
// DB from the template's CONTENTS via SQL keeps physical row order identical to a
// fresh init.
//
// Readiness is published from globalSetup to the forks via an env var (forks
// inherit the main process env at spawn time). When it is unset — e.g.
// `test:single` on one file with no globalSetup — the callers fall back to a full
// knex-migrator init, so behaviour is unchanged outside the orchestrated run.
//
// SCOPE: only the db.reset() provisioning path (agentProvider-based e2e / e2e-api
// / e2e-* suites) uses this. The getFixtureOps `testUtils.setup()` path
// (integration/legacy) opens Ghost's bookshelf connection BEFORE provisioning, so
// that path still does a full init — those suites run isolate:true (a fresh
// process per file), so the per-file boot, not provisioning, is their cost.

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
 * Resolve the template sqlite filename from the CURRENT fork connection's config.
 * config holds the suffixed per-fork filename (`<base>-pool_N.db`); the pure
 * deriver strips that suffix so this resolves to the same `<base>-template.db`
 * globalSetup built from the un-suffixed base.
 * @returns {string}
 */
const getForkTemplateFilename = () => {
    return deriveSQLiteTemplateFilename(config.get('database:connection:filename'));
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
 * before any fork). Derives the template location from the run's BASE
 * (un-suffixed) DB identifier, points Ghost's config there, then runs a full
 * knex-migrator reset + init. A fresh KnexMigrator is constructed AFTER the config
 * override so it reads the template location via MigratorConfig.js.
 *
 * @param {{mysqlBase?: string, sqliteBase?: string}} base the run's base DB identifier, un-suffixed
 */
const buildTemplate = async (base) => {
    if (configuredClientIsSQLite()) {
        // Build the template .db file at a path that can't collide with any
        // per-fork `pool_N.db` (deriveSQLiteTemplateFilename appends a `-template`
        // marker no fork uses). Remove any stale file first — knex-migrator's
        // reset drops tables but not the file, and a leftover from a previous run
        // could carry the wrong schema (mirrors db-utils' sqlite reset, which
        // fs.remove()s before init).
        const templateFile = deriveSQLiteTemplateFilename(base.sqliteBase);
        debug(`Building shared sqlite DB template at ${templateFile}`);
        for (const suffix of ['', '-journal', '-wal', '-shm']) {
            await fs.remove(`${templateFile}${suffix}`);
        }

        // Point Ghost's config at the template file so the KnexMigrator built
        // below (which reads config.get('database') via MigratorConfig.js) targets
        // it. We replace the whole `database:connection` node rather than the
        // `:filename` leaf: CI exports `database__connection__filename` to the main
        // process where globalSetup runs (see ci.yml), and nconf's env layer
        // shadows a leaf set when an object-level get reads the node — so a leaf
        // set would silently build the template into the base file. Setting the
        // object node overrides the env layer. (The mysql path sets a leaf safely:
        // its db NAME is not exported to the main process — vitest-setup-db.ts sets
        // it per fork — so there is no env node to shadow it.)
        config.set('database:connection', {
            ...config.get('database:connection'),
            filename: templateFile
        });
        const knexMigrator = new KnexMigrator({knexMigratorFilePath: path.join(__dirname, '../..')});
        await knexMigrator.reset({force: true});
        await knexMigrator.init();

        process.env[TEMPLATE_ENV_VAR] = '1';
        debug('Shared sqlite DB template ready');
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
 * Restore the current fork's per-process sqlite database from the shared
 * template.
 *
 * ATTACH is per-connection, and the fork's db.knex pool may route successive
 * statements to different connections — so the whole restore runs on ONE
 * connection pinned from that pool (acquireConnection + `.connection(conn)`).
 * Pinning the LIVE pool's connection (rather than opening a second knex to the
 * same file) means the restore writes the fork's own inode, so db.knex reads the
 * committed result back directly — copying into a separate connection's inode, or
 * fs.remove()ing the file out from under the open pool, would leave db.knex on a
 * stale empty handle. (Mirrors the short-lived connection the mysql path opens in
 * ensureForkDatabaseExists, but here it must be a pool connection, not a new pool.)
 *
 * The fork .db file is fresh on first provision (deleted at boot, see
 * vitest-setup-db.ts), so the restore builds the entire schema + data from the
 * template: replay every sqlite_master object's DDL in creation (rowid) order —
 * tables, then their indexes, triggers and views, which always follow their table
 * in that order — then bulk-copy each table's rows, foreign keys off during the
 * load. This keeps physical row order identical to a fresh init — we do
 * NOT copy the template file over the connection (the previously-reverted approach).
 */
const restoreFromTemplateSQLite = async () => {
    const templateFile = getForkTemplateFilename();
    debug(`Restoring fork sqlite DB ${config.get('database:connection:filename')} from template ${templateFile}`);

    // ATTACH on a missing file silently creates an empty DB, which would surface
    // later as a baffling "no such table: template.<t>" mid-restore. Fail loudly
    // up front instead if the template (built by globalSetup) is not where the
    // fork derived it should be — a path-derivation drift between build and restore.
    if (!fs.existsSync(templateFile)) {
        throw new Error(`sqlite DB template not found at ${templateFile} (built by vitest globalSetup)`);
    }

    // Pin one connection: ATTACH/DETACH and the schema replay must all run on the
    // same connection, and it must be the live pool's so db.knex sees the result.
    const connection = await db.knex.client.acquireConnection();
    const run = (sql, bindings) => db.knex.raw(sql, bindings || []).connection(connection);

    try {
        await run('ATTACH DATABASE ? AS template', [templateFile]);

        // Every schema object with a CREATE statement, in creation order. Auto
        // objects (sqlite_autoindex_*) have NULL sql and so are excluded — they
        // are recreated implicitly when their table's DDL replays. sqlite_sequence
        // carries non-null DDL but is reserved/auto-created, so skip it here; its
        // counters are copied with the row data below.
        const objects = (await run(
            'SELECT type, name, sql FROM template.sqlite_master WHERE sql IS NOT NULL ORDER BY rowid'
        )).filter(object => object.name !== 'sqlite_sequence');

        // Disable FK enforcement so tables load in any order and a table's FK can
        // reference one not yet populated. Replaying the template's exact CREATE
        // TABLE DDL (rather than a column-only copy) preserves its foreign keys,
        // making the restore byte-faithful to a fresh init — the same faithfulness
        // the mysql path needs.
        await run('PRAGMA foreign_keys = OFF');
        try {
            for (const object of objects) {
                await run(object.sql);
            }

            // Copy EVERY table the template holds, derived from its sqlite_master
            // rather than getResetTables(): that list omits knex-migrator's own
            // `migrations_lock`, whose released-lock row (locked=0) Ghost's boot
            // requires — an empty lock table reads as "migration in progress" and
            // boot dies with MigrationsAreLockedError. This also picks up
            // `sqlite_sequence` (the AUTOINCREMENT counters, auto-created with the
            // first AUTOINCREMENT table above) so inserts continue exactly where the
            // template left off. Using the template's own table set keeps the copy
            // complete and faithful by construction.
            const dataTables = (await run(
                'SELECT name FROM template.sqlite_master WHERE type = ?', ['table']
            )).map(row => row.name);

            await sequence(dataTables.map(table => async () => {
                await run('DELETE FROM ??', [table]);
                await run('INSERT INTO ?? SELECT * FROM template.??', [table, table]);
            }));
        } finally {
            await run('PRAGMA foreign_keys = ON');
        }
    } finally {
        // Always detach before releasing the connection — an error mid-restore must
        // not return a connection still attached to the template back to the pool.
        try {
            await run('DETACH DATABASE template');
        } catch (e) {
            // nothing attached (ATTACH may have failed)
        }
        await db.knex.client.releaseConnection(connection);
    }
};

/**
 * Restore the current fork's per-process database from the shared template.
 * Assumes the caller has verified hasTemplate(). Copies every table from the
 * template DB into the fork DB (replay the template's exact schema + INSERT ...
 * SELECT). On mysql the template is referenced by qualified name on the fork's
 * bound connection; on sqlite the template file is ATTACHed (see the sqlite
 * helper above).
 */
const restoreFromTemplate = async () => {
    if (configuredClientIsSQLite()) {
        return restoreFromTemplateSQLite();
    }

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
    // has the same views as a fully-migrated one. (sqlite copies views as part of
    // the sqlite_master replay above, so this is mysql-only.)
    for (const [name, sql] of Object.entries(schemaViews)) {
        await db.knex.schema.createViewOrReplace(name, function (view) {
            view.as(db.knex.raw(sql));
        });
    }
};

/**
 * Drop the shared template database. Called from globalSetup teardown. Best
 * effort — on CI the whole server is ephemeral; this is for local hygiene and to
 * avoid a stale template surviving into the next run.
 *
 * @param {{mysqlBase?: string, sqliteBase?: string}} base the run's base DB id
 */
const dropTemplate = async (base) => {
    if (configuredClientIsSQLite()) {
        // knex-migrator's reset drops tables but not the file; delete the template
        // file (+ sidecars) outright.
        try {
            const templateFile = deriveSQLiteTemplateFilename(base.sqliteBase);
            for (const suffix of ['', '-journal', '-wal', '-shm']) {
                await fs.remove(`${templateFile}${suffix}`);
            }
        } catch (err) {
            debug(`Failed to drop sqlite template (ignored): ${err.message}`);
        }
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
    deriveSQLiteTemplateFilename,
    configuredClientIsSQLite,
    hasTemplate,
    buildTemplate,
    restoreFromTemplate,
    dropTemplate
};
