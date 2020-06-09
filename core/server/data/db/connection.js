const knex = require('knex');
const config = require('../../../shared/config');
const logging = require('../../../shared/logging');
const errors = require('@tryghost/errors');
let knexInstance;

// @TODO:
// - if you require this file before config file was loaded,
// - then this file is cached and you have no chance to connect to the db anymore
// - bring dynamic into this file (db.connect())
function configure(dbConfig) {
    const client = dbConfig.client;

    if (client === 'sqlite3') {
        dbConfig.useNullAsDefault = Object.prototype.hasOwnProperty.call(dbConfig, 'useNullAsDefault') ? dbConfig.useNullAsDefault : true;
    }

    if (client === 'mysql') {
        dbConfig.connection.timezone = 'UTC';
        dbConfig.connection.charset = 'utf8mb4';

        dbConfig.connection.loggingHook = function loggingHook(err) {
            logging.error(new errors.InternalServerError({
                code: 'MYSQL_LOGGING_HOOK',
                err: err
            }));
        };
    }

    return dbConfig;
}

if (!knexInstance && config.get('database') && config.get('database').client) {
    knexInstance = knex(configure(config.get('database')));
}

module.exports = knexInstance;
