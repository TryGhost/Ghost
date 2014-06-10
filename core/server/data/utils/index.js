var _           = require('lodash'),
    when        = require('when'),
    knex        = require('../../models/base').knex,
    schema      = require('../schema').tables,
    client      = require('../../models/base').client;

function createTable(table) {
    return knex.schema.createTable(table, function (t) {
        var column,
            columnKeys = _.keys(schema[table]);
        _.each(columnKeys, function (key) {
            // creation distinguishes between text with fieldtype, string with maxlength and all others
            if (schema[table][key].type === 'text' && schema[table][key].hasOwnProperty('fieldtype')) {
                column = t[schema[table][key].type](key, schema[table][key].fieldtype);
            } else if (schema[table][key].type === 'string' && schema[table][key].hasOwnProperty('maxlength')) {
                column = t[schema[table][key].type](key, schema[table][key].maxlength);
            } else {
                column = t[schema[table][key].type](key);
            }

            if (schema[table][key].hasOwnProperty('nullable') && schema[table][key].nullable === true) {
                column.nullable();
            } else {
                column.notNullable();
            }
            if (schema[table][key].hasOwnProperty('primary') && schema[table][key].primary === true) {
                column.primary();
            }
            if (schema[table][key].hasOwnProperty('unique') && schema[table][key].unique) {
                column.unique();
            }
            if (schema[table][key].hasOwnProperty('unsigned') && schema[table][key].unsigned) {
                column.unsigned();
            }
            if (schema[table][key].hasOwnProperty('references') && schema[table][key].hasOwnProperty('inTable')) {
                //check if table exists?
                column.references(schema[table][key].references);
                column.inTable(schema[table][key].inTable);
            }
            if (schema[table][key].hasOwnProperty('defaultTo')) {
                column.defaultTo(schema[table][key].defaultTo);
            }
        });
    });
}

function deleteTable(table) {
    return knex.schema.dropTableIfExists(table);
}

function getTablesFromSqlite3() {
    return knex.raw("select * from sqlite_master where type = 'table'").then(function (response) {
        return _.reject(_.pluck(response[0], 'tbl_name'), function (name) {
            return name === 'sqlite_sequence';
        });
    });
}

function getTablesFromPgSQL() {
    return knex.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'").then(function (response) {
        return _.flatten(_.pluck(response.rows, 'table_name'));
    });
}

function getTablesFromMySQL() {
    return knex.raw('show tables').then(function (response) {
        return _.flatten(_.map(response[0], function (entry) {
            return _.values(entry);
        }));
    });
}

function getTables() {
    if (client === 'sqlite3') {
        return getTablesFromSqlite3();
    }
    if (client === 'mysql') {
        return getTablesFromMySQL();
    }
    if (client === 'pg') {
        return getTablesFromPgSQL();
    }
    return when.reject("No support for database client " + client);
}

module.exports = {
    createTable: createTable,
    deleteTable: deleteTable,
    getTables: getTables
};
