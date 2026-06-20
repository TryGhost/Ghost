const debug = require('@tryghost/debug')('test:dbUtils');

// Utility Packages
const fs = require('fs-extra');
const path = require('path');
const KnexMigrator = require('knex-migrator');
// Resolve MigratorConfig.js from the package root explicitly rather than via
// process.cwd(): the unified `pnpm test:watch` runs from the repo root, and
// worker threads cannot chdir. From ghost/core this is the same path, so it
// is a no-op for the standalone mocha/vitest runs.
const knexMigrator = new KnexMigrator({knexMigratorFilePath: path.join(__dirname, '../..')});
const DatabaseInfo = require('@tryghost/database-info');

// Ghost Internals
const config = require('../../core/shared/config');
const db = require('../../core/server/data/db');
const schema = require('../../core/server/data/schema').tables;
const schemaTables = Object.keys(schema);
const {sequence} = require('@tryghost/promise');

// Other Test Utilities
const urlServiceUtils = require('./url-service-utils');
const dbTemplate = require('./db-template');

let dbInitialized = false;
let mysqlSnapshotDatabase = null;
const mysqlSnapshotTablePrefix = '__ghost_snapshot_';

/**
 * Checks if the current active connection is a MySQL database
 * @returns {boolean} isMySQL
 */
module.exports.isMySQL = () => {
    return DatabaseInfo.isMySQL(db.knex);
};

/**
 * Checks if the current active connection is a SQLite database
 * @returns {boolean} isSQLite
 */
module.exports.isSQLite = () => {
    return DatabaseInfo.isSQLite(db.knex);
};

/**
 * Reset
 * - restores the DB to a fresh state with the default fixtures in place
 * - has many behind the scenes tricks to try to do this as fast as possible
 *
 * @param {Object} options
 * @param {boolean} options.truncate whether to truncate rather thann fully reset
 */
module.exports.reset = async ({truncate} = {truncate: false}) => {
    if (module.exports.isSQLite()) {
        const filename = config.get('database:connection:filename');
        const filenameOrig = `${filename}-orig`;

        if (dbInitialized) {
            await fs.copyFile(filenameOrig, filename);
        } else if (dbTemplate.hasTemplate()) {
            // First provision in this fork: build the schema + fixtures from the
            // run's shared (migrated + seeded) template — ATTACH the template file
            // and bulk-copy it onto db.knex's own connection — instead of a full
            // per-file migrate+seed (PLA-172). Then snapshot to `-orig` so later
            // in-fork resets take the fast file-copy path above. The fork file is
            // already fresh (deleted at boot, see vitest-setup-db.ts), and the
            // restore writes db.knex's inode, so we must NOT fs.remove() it here —
            // that would strand db.knex on a stale empty handle.
            await dbTemplate.restoreFromTemplate();

            await fs.copyFile(filename, filenameOrig);
            dbInitialized = true;
        } else {
            await fs.remove(filename);
            await fs.remove(`${filename}-journal`);
            await fs.remove(filenameOrig);

            // Do a full database reset & initialisation
            await forceReinit();

            await fs.copyFile(filename, filenameOrig);
            dbInitialized = true;
        }
    } else {
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
        await knexMigrator.reset({force: true});
    }

    await dropMySQLSnapshots();
};

/**
 * Truncate
 * - truncate a single table
 * @param {string} tableName - the table to truncate
 */
module.exports.truncate = async (tableName) => {
    if (module.exports.isSQLite()) {
        const [foreignKeysEnabled] = await db.knex.raw('PRAGMA foreign_keys;');
        if (foreignKeysEnabled.foreign_keys) {
            await db.knex.raw('PRAGMA foreign_keys = OFF;');
        }
        await db.knex(tableName).truncate();
        if (foreignKeysEnabled.foreign_keys) {
            await db.knex.raw('PRAGMA foreign_keys = ON;');
        }
        return;
    }

    await db.knex.raw('SET FOREIGN_KEY_CHECKS=0;');
    await db.knex(tableName).truncate();
    await db.knex.raw('SET FOREIGN_KEY_CHECKS=1;');
};

/**
 * Internal helper to do a safe-but-slow knex-based forced reinit of the DB.
 */
const forceReinit = async () => {
    await knexMigrator.reset({force: true});
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
        if (dbTemplate.hasTemplate()) {
            // First provision in this fork: load the schema + fixtures from the
            // run's shared (migrated + seeded) template — a same-server bulk
            // table copy rather than a full migrate+seed — then build the
            // per-process snapshot tables so later in-fork resets take the fast
            // restoreMySQLSnapshot path.
            await dbTemplate.restoreFromTemplate();
        } else {
            await truncateAll();
            await knexMigrator.init({only: 3});
        }
        await createMySQLSnapshot();
        return;
    }

    await restoreMySQLSnapshot();
};

const createMySQLSnapshot = async () => {
    if (!module.exports.isMySQL()) {
        return;
    }

    const tables = getResetTables();

    await sequence(tables.map(table => async () => {
        const snapshotTable = getMySQLSnapshotTableName(table);

        await db.knex.schema.dropTableIfExists(snapshotTable);
        await db.knex.raw('CREATE TABLE ?? LIKE ??', [snapshotTable, table]);
        await db.knex.raw('INSERT INTO ?? SELECT * FROM ??', [snapshotTable, table]);
    }));

    mysqlSnapshotDatabase = getMySQLDatabaseName();
};

const restoreMySQLSnapshot = async () => {
    debug('Database snapshot restore');
    urlServiceUtils.reset();

    const tables = getResetTables();

    await db.knex.transaction(async (trx) => {
        try {
            await db.knex.raw('SET FOREIGN_KEY_CHECKS=0;').transacting(trx);

            await sequence(tables.map(table => async () => {
                const snapshotTable = getMySQLSnapshotTableName(table);

                await db.knex.raw('DELETE FROM ??', [table]).transacting(trx);
                await db.knex.raw('INSERT INTO ?? SELECT * FROM ??', [table, snapshotTable]).transacting(trx);
            }));
        } finally {
            await db.knex.raw('SET FOREIGN_KEY_CHECKS=1;').transacting(trx);
            debug('Database snapshot restore end');
        }
    });
};

const dropMySQLSnapshots = async () => {
    if (!module.exports.isMySQL()) {
        return;
    }

    mysqlSnapshotDatabase = null;

    try {
        await sequence(getResetTables().map(table => () => {
            return db.knex.schema.dropTableIfExists(getMySQLSnapshotTableName(table));
        }));
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
 * Has to run in a transaction for MySQL, otherwise the foreign key check does not work.
 * Sqlite3 has no truncate command.
 */
const truncateAll = async () => {
    debug('Database teardown');
    urlServiceUtils.reset();

    const tables = getResetTables();

    if (module.exports.isSQLite()) {
        try {
            const [foreignKeysEnabled] = await db.knex.raw('PRAGMA foreign_keys;');
            if (foreignKeysEnabled.foreign_keys) {
                await db.knex.raw('PRAGMA foreign_keys = OFF;');
            }

            await sequence(tables.map(table => () => {
                return db.knex.raw('DELETE FROM ' + table + ';');
            }));

            if (foreignKeysEnabled.foreign_keys) {
                await db.knex.raw('PRAGMA foreign_keys = ON;');
            }

            return;
        } catch (err) {
            // CASE: table does not exist
            if (err.errno === 1) {
                return Promise.resolve();
            }

            throw err;
        } finally {
            debug('Database teardown end');
        }
    }

    await db.knex.transaction(async (trx) => {
        try {
            await db.knex.raw('SET FOREIGN_KEY_CHECKS=0;').transacting(trx);
            await sequence(tables.map(table => () => db.knex.raw('DELETE FROM ' + table + ';').transacting(trx)));
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
    await urlServiceUtils.reset();
    await urlServiceUtils.init();
    await urlServiceUtils.isFinished();
};

module.exports.knex = db.knex;
