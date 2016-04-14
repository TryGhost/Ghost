var knex     = require('knex'),
    config   = require('../../config'),
    dbConfig = config.database,
    knexInstance;

function configure(dbConfig) {
    var client = dbConfig.client,
        pg;

    if (client === 'pg' || client === 'postgres' || client === 'postgresql') {
        try {
            pg = require('pg');
        } catch (e) {
            pg = require('pg.js');
        }

        // By default PostgreSQL returns data as strings along with an OID that identifies
        // its type.  We're setting the parser to convert OID 20 (int8) into a javascript
        // integer.
        pg.types.setTypeParser(20, function (val) {
            return val === null ? null : parseInt(val, 10);
        });
    }

    if (client === 'sqlite3') {
        dbConfig.useNullAsDefault = dbConfig.useNullAsDefault || false;
    }

    return dbConfig;
}

if (!knexInstance && dbConfig && dbConfig.client) {
    knexInstance = knex(configure(dbConfig));
}

module.exports = knexInstance;
