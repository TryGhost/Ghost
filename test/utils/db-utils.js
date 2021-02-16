const debug = require('ghost-ignition').debug('test:dbUtils');

// Utility Packages
const Promise = require('bluebird');
const KnexMigrator = require('knex-migrator');
const knexMigrator = new KnexMigrator();

// Ghost Internals
const {events} = require('../../core/server/lib/common');
const config = require('../../core/shared/config');
const db = require('../../core/server/data/db');
const schema = require('../../core/server/data/schema').tables;
const schemaTables = Object.keys(schema);

const urlService = require('../../core/frontend/services/url');

module.exports.initData = () => {
    return knexMigrator.init()
        .then(function () {
            events.emit('db.ready');

            let timeout;

            return new Promise(function (resolve) {
                (function retry() {
                    clearTimeout(timeout);

                    if (urlService.hasFinished()) {
                        return resolve();
                    }

                    timeout = setTimeout(retry, 50);
                })();
            });
        });
};

module.exports.clearBruteData = () => {
    return db.knex('brute').truncate();
};

module.exports.truncate = (tableName) => {
    if (config.get('database:client') === 'sqlite3') {
        return db.knex(tableName).truncate();
    }

    return db.knex.raw('SET FOREIGN_KEY_CHECKS=0;')
        .then(function () {
            return db.knex(tableName).truncate();
        })
        .then(function () {
            return db.knex.raw('SET FOREIGN_KEY_CHECKS=1;');
        });
};

// we must always try to delete all tables
module.exports.clearData = () => {
    debug('Database reset');
    return knexMigrator.reset({force: true})
        .then(function () {
            urlService.softReset();
        });
};

/**
 * Has to run in a transaction for MySQL, otherwise the foreign key check does not work.
 * Sqlite3 has no truncate command.
 */
module.exports.teardown = () => {
    debug('Database teardown');
    urlService.softReset();

    const tables = schemaTables.concat(['migrations']);

    if (config.get('database:client') === 'sqlite3') {
        return Promise
            .mapSeries(tables, function createTable(table) {
                return db.knex.raw('DELETE FROM ' + table + ';');
            })
            .catch(function (err) {
                // CASE: table does not exist
                if (err.errno === 1) {
                    return Promise.resolve();
                }

                throw err;
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
