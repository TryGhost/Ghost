const _ = require('lodash');
const knex = require('knex');
const os = require('os');
const fs = require('fs');

const logging = require('@tryghost/logging');
const config = require('../../../shared/config');
const errors = require('@tryghost/errors');

/** @type {knex.Knex} */
let knexInstance;

// @TODO:
// - if you require this file before config file was loaded,
// - then this file is cached and you have no chance to connect to the db anymore
// - bring dynamic into this file (db.connect())
function configure(dbConfig) {
    const client = dbConfig.client;

    if (client === 'sqlite3' || client === 'node-sqlite') {
        // Backwards compatibility with old knex behaviour
        dbConfig.useNullAsDefault = Object.prototype.hasOwnProperty.call(dbConfig, 'useNullAsDefault') ? dbConfig.useNullAsDefault : true;

        // Enables foreign key checks and delete on cascade
        dbConfig.pool = {
            afterCreate(conn, cb) {
                if (client === 'sqlite3') {
                    conn.run('PRAGMA foreign_keys = ON', cb);

                    // These two are meant to improve performance at the cost of reliability
                    // Should be safe for tests. We add them here and leave them on
                    if (config.get('env').startsWith('testing')) {
                        conn.run('PRAGMA synchronous = OFF;');
                        conn.run('PRAGMA journal_mode = TRUNCATE;');
                    }
                } else if (client === 'node-sqlite') {
                    // node-sqlite uses exec for PRAGMA statements
                    conn.exec('PRAGMA foreign_keys = ON');

                    // These two are meant to improve performance at the cost of reliability
                    // Should be safe for tests. We add them here and leave them on
                    if (config.get('env').startsWith('testing')) {
                        conn.exec('PRAGMA synchronous = OFF');
                        conn.exec('PRAGMA journal_mode = TRUNCATE');
                    }
                    cb();
                }
            }
        };

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

        if (process.env.REQUIRE_INFILE_STREAM) {
            if (process.env.NODE_ENV === 'development' || process.env.ALLOW_INFILE_STREAM) {
                dbConfig.connection.infileStreamFactory = path => fs.createReadStream(path);
            } else {
                throw new errors.InternalServerError({message: 'MySQL infile streaming is required to run the current process, but is not allowed. Run the script in development mode or set ALLOW_INFILE_STREAM=1.'});
            }
        }
    }

    return dbConfig;
}

if (!knexInstance && config.get('database') && config.get('database').client) {
    knexInstance = knex(configure(config.get('database')));
}

module.exports = knexInstance;
