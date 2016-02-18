var knex     = require('knex'),
    config   = require('../../config'),
    dbConfig = config.database,
    knexInstance;

function configureDriver(client) {
    var pg;

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
}

if (!knexInstance && dbConfig && dbConfig.client) {
    configureDriver(dbConfig.client);
    knexInstance = knex(dbConfig);
}

module.exports = knexInstance;
