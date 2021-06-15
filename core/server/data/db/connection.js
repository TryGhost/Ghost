const knex = require('knex');
const config = require('../../../shared/config');
let knexInstance;

// @TODO:
// - if you require this file before config file was loaded,
// - then this file is cached and you have no chance to connect to the db anymore
// - bring dynamic into this file (db.connect())
function configure(dbConfig) {
    const client = dbConfig.client;

    if (client === 'sqlite3') {
        // Backwards compatibility with old knex behaviour
        dbConfig.useNullAsDefault = Object.prototype.hasOwnProperty.call(dbConfig, 'useNullAsDefault') ? dbConfig.useNullAsDefault : true;

        // Enables foreign key checks and delete on cascade
        dbConfig.pool = {
            afterCreate(conn, cb) {
                conn.run('PRAGMA foreign_keys = ON', cb);
            }
        };

        // Force bthreads to use child_process backend until a worker_thread-compatible version of sqlite3 is published
        // https://github.com/mapbox/node-sqlite3/issues/1386
        process.env.BTHREADS_BACKEND = 'child_process';
    }

    if (client === 'mysql') {
        dbConfig.connection.timezone = 'UTC';
        dbConfig.connection.charset = 'utf8mb4';

        // NOTE: disabled so that worker processes can use the db without
        // requiring logging and causing file desriptor leaks.
        // See https://github.com/TryGhost/Ghost/issues/12496
        //
        // const logging = require('@tryghost/logging');
        // const errors = require('@tryghost/errors');
        // dbConfig.connection.loggingHook = function loggingHook(err) {
        //     logging.error(new errors.InternalServerError({
        //         code: 'MYSQL_LOGGING_HOOK',
        //         err: err
        //     }));
        // };
    }

    return dbConfig;
}

if (!knexInstance && config.get('database') && config.get('database').client) {
    knexInstance = knex(configure(config.get('database')));
}

module.exports = knexInstance;
