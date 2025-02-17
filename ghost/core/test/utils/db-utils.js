const debug = require('@tryghost/debug')('test:dbUtils');

// Utility Packages
const fs = require('fs-extra');
const KnexMigrator = require('knex-migrator');
const knexMigrator = new KnexMigrator();
const DatabaseInfo = require('@tryghost/database-info');

// Ghost Internals
const config = require('../../core/shared/config');
const db = require('../../core/server/data/db');
const schema = require('../../core/server/data/schema').tables;
const schemaTables = Object.keys(schema);
const {sequence} = require('@tryghost/promise');

// Other Test Utilities
const urlServiceUtils = require('./url-service-utils');

let dbInitialized = false;

/**
 * Checks if the current active connection is a MySQL database
 * @returns {Boolean} isMySQL
 */
module.exports.isMySQL = () => {
    return DatabaseInfo.isMySQL(db.knex);
};

/**
 * Checks if the current active connection is a SQLite database
 * @returns {Boolean} isSQLite
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
 * @param {Boolean} options.truncate whether to truncate rather thann fully reset
 */
module.exports.reset = async ({truncate} = {truncate: false}) => {
    if (module.exports.isSQLite()) {
        const filename = config.get('database:connection:filename');
        const filenameOrig = `${filename}-orig`;

        if (dbInitialized) {
            await fs.copyFile(filenameOrig, filename);
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
                await truncateAll();
                await knexMigrator.init({only: 2});
            } catch (err) {
                // If it fails, try a normal restore
                await forceReinit();
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
};

/**
 * Internal helper to attempt to truncate all tables as fast as possible
 * Has to run in a transaction for MySQL, otherwise the foreign key check does not work.
 * Sqlite3 has no truncate command.
 */
const truncateAll = async () => {
    debug('Database teardown');
    urlServiceUtils.reset();

    const tables = schemaTables.concat(['migrations']);

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
