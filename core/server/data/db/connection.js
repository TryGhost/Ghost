var knex = require('knex'),
    config = require('../../config'),
    knexInstance;

// @TODO:
// - if you require this file before config file was loaded,
// - then this file is cached and you have no chance to connect to the db anymore
// - bring dynamic into this file (db.connect())
function configure(dbConfig) {
    var client = dbConfig.client;

    if (client === 'sqlite3') {
        dbConfig.useNullAsDefault = dbConfig.useNullAsDefault || false;
    }

    if (client === 'mysql') {
        dbConfig.connection.timezone = 'UTC';
        dbConfig.connection.charset = 'utf8mb4';
    }

    return dbConfig;
}

if (!knexInstance && config.get('database') && config.get('database').client) {
    knexInstance = knex(configure(config.get('database')));
}

module.exports = knexInstance;
