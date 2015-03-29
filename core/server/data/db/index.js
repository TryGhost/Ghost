/*jshint laxcomma: true, smarttabs: true, node: true*/
'use strict';
/**
 * Database primary database module
 * @module ghost/core/server/data/db
 * @since 0.5.10
 * @requires ghost/core/server/data/db/connection
 */

var connection;
/**
 * @readonly
 * @static
 * @name knex
 * @memberof module:ghost/core/server/data/db
 * @property {Object} knex A single knex database connection for the configured database client
 **/
Object.defineProperties(exports, {
    knex:{
        enumerable:true,
        configruable:false,
        get:function () {
            connection = connection || require('./connection');
            return connection;
        }
    }
});
