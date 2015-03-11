/*jshint laxcomma: true, smarttabs: true, node: true*/
'use strict';
/**
 * Primary database connection
 * @module ghost/core/server/data/db/connection
 * @since 0.5.10
 * @requires pg
 * @requires knex
 * @requires ghost/core/server/config
 */
var knex   = require('knex'),
    config = require('../../config'),
    dbconfig,
    knexInstance
    ;

dbconfig = config.get('database');

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

if (!knexInstance && dbconfig && dbconfig.client) {
    configureDriver(dbconfig.client);
    knexInstance = knex(dbconfig);
}

module.exports = knexInstance;
