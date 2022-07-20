const _ = require('lodash');
const knex = require('knex');
const os = require('os');

const logging = require('@tryghost/logging');
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

                // These two are meant to improve performance at the cost of reliability
                // Should be safe for tests. We add them here and leave them on
                if (config.get('env').startsWith('testing')) {
                    conn.run('PRAGMA synchronous = OFF;');
                    conn.run('PRAGMA journal_mode = TRUNCATE;');
                }
            }
        };

        // Force bthreads to use child_process backend until a worker_thread-compatible version of sqlite3 is published
        // https://github.com/mapbox/node-sqlite3/issues/1386
        process.env.BTHREADS_BACKEND = 'child_process';

        // In the default SQLite test config we set the path to /tmp/ghost-test.db,
        // but this won't work on Windows, so we need to replace the /tmp bit with
        // the Windows temp folder
        const filename = dbConfig.connection.filename;
        if (process.platform === 'win32' && _.isString(filename) && filename.match(/^\/tmp/)) {
            dbConfig.connection.filename = filename.replace(/^\/tmp/, os.tmpdir());
            logging.info(`Ghost DB path: ${dbConfig.connection.filename}`);
        }
    }

    if (client === 'mysql2') {
        dbConfig.connection.timezone = 'Z';
        dbConfig.connection.charset = 'utf8mb4';
        dbConfig.connection.decimalNumbers = true;
    }

    return dbConfig;
}

if (!knexInstance && config.get('database') && config.get('database').client) {
    knexInstance = knex(configure(config.get('database')));
}

module.exports = knexInstance;
