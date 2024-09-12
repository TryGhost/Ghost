const _ = require('lodash');
const knex = require('knex');
const os = require('os');
const fs = require('fs');

const logging = require('@tryghost/logging');
const metrics = require('@tryghost/metrics');
const config = require('../../../shared/config');
const errors = require('@tryghost/errors');
const ConnectionPoolInstrumentation = require('./ConnectionPoolInstrumentation');

const promClient = require('prom-client');

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
    new promClient.Gauge({
        name: 'ghost_db_connection_pool_used',
        help: 'Number of connections currently in use in the database connection pool',
        collect() {
            this.set(knexInstance.client.pool.numUsed());
        }
    });
    new promClient.Gauge({
        name: 'ghost_db_connection_pool_free',
        help: 'Number of free connections in the database connection pool',
        collect() {
            this.set(knexInstance.client.pool.numFree());
        }
    });
    new promClient.Gauge({
        name: 'ghost_db_connection_pool_pending_creates',
        help: 'Number of pending create requests in the database connection pool',
        collect() {
            this.set(knexInstance.client.pool.numPendingCreates());
        }
    });
    new promClient.Gauge({
        name: 'ghost_db_connection_pool_pending_acquires',
        help: 'Number of pending acquire requests in the database connection pool',
        collect() {
            this.set(knexInstance.client.pool.numPendingAcquires());
        }
    });
    new promClient.Gauge({
        name: 'ghost_db_connection_pool_utilization',
        help: 'Percentage of connections in use in the database connection pool',
        collect() {
            this.set(knexInstance.client.pool.numUsed() / (knexInstance.client.pool.max));
        }
    });
    new promClient.Gauge({
        name: 'ghost_db_connection_pool_max',
        help: 'Total number of connections in the database connection pool',
        collect() {
            this.set(knexInstance.client.pool.max);
        }
    });
    const queryCounter = new promClient.Counter({
        name: 'ghost_db_queries_total',
        help: 'Total number of queries executed'
    });
    knexInstance.on('query', () => {
        queryCounter.inc();
    });
    if (config.get('telemetry:connectionPool')) {
        const instrumentation = new ConnectionPoolInstrumentation({knex: knexInstance, logging, metrics, config});
        instrumentation.instrument();
    }
}

module.exports = knexInstance;
