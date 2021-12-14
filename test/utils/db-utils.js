const debug = require('@tryghost/debug')('test:dbUtils');

// Utility Packages
const fs = require('fs-extra');
const Promise = require('bluebird');
const KnexMigrator = require('knex-migrator');
const knexMigrator = new KnexMigrator();

// Ghost Internals
const config = require('../../core/shared/config');
const db = require('../../core/server/data/db');
const schema = require('../../core/server/data/schema').tables;
const schemaTables = Object.keys(schema);

// Other Test Utilities
const urlServiceUtils = require('./url-service-utils');

const dbHash = Date.now();

module.exports.reset = async () => {
    // Only run this copy in CI until it gets fleshed out
    if (process.env.CI && config.get('database:client') === 'sqlite3') {
        const filename = config.get('database:connection:filename');
        const filenameOrig = `${filename}.${dbHash}-orig`;

        const dbExists = await fs.pathExists(filenameOrig);

        if (dbExists) {
            await db.knex.destroy();
            await fs.copyFile(filenameOrig, filename);
        } else {
            await knexMigrator.reset({force: true});

            // Do a full database initialisation
            await knexMigrator.init();

            await fs.copyFile(filename, filenameOrig);
        }
    } else {
        await knexMigrator.reset({force: true});

        // Do a full database initialisation
        await knexMigrator.init();
    }
};

module.exports.initData = async () => {
    await knexMigrator.init();
    await urlServiceUtils.reset();
    await urlServiceUtils.init();
    await urlServiceUtils.isFinished();
};

module.exports.truncate = async (tableName) => {
    if (config.get('database:client') === 'sqlite3') {
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

// we must always try to delete all tables
module.exports.clearData = async () => {
    debug('Database reset');
    await knexMigrator.reset({force: true});
    urlServiceUtils.reset();
};

/**
 * Has to run in a transaction for MySQL, otherwise the foreign key check does not work.
 * Sqlite3 has no truncate command.
 */
module.exports.teardown = () => {
    debug('Database teardown');
    urlServiceUtils.reset();

    const tables = schemaTables.concat(['migrations']);

    if (config.get('database:client') === 'sqlite3') {
        return Promise
            .mapSeries(tables, function createTable(table) {
                return (async function () {
                    const [foreignKeysEnabled] = await db.knex.raw('PRAGMA foreign_keys;');
                    if (foreignKeysEnabled.foreign_keys) {
                        await db.knex.raw('PRAGMA foreign_keys = OFF;');
                    }
                    await db.knex.raw('DELETE FROM ' + table + ';');
                    if (foreignKeysEnabled.foreign_keys) {
                        await db.knex.raw('PRAGMA foreign_keys = ON;');
                    }
                })();
            })
            .catch(function (err) {
                // CASE: table does not exist
                if (err.errno === 1) {
                    return Promise.resolve();
                }

                throw err;
            })
            .finally(() => {
                debug('Database teardown end');
            });
    }

    return db.knex.transaction(function (trx) {
        return db.knex.raw('SET FOREIGN_KEY_CHECKS=0;').transacting(trx)
            .then(function () {
                return Promise
                    .each(tables, function createTable(table) {
                        return db.knex.raw('TRUNCATE ' + table + ';').transacting(trx);
                    });
            })
            .then(function () {
                return db.knex.raw('SET FOREIGN_KEY_CHECKS=1;').transacting(trx);
            })
            .catch(function (err) {
                // CASE: table does not exist
                if (err.errno === 1146) {
                    return Promise.resolve();
                }

                throw err;
            });
    });
};
