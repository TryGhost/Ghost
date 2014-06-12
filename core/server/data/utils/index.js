var _       = require('lodash'),
    when    = require('when'),
    knex    = require('../../models/base').knex,
    schema  = require('../schema').tables,
    client  = require('../../models/base').client,
    sqlite3 = require('./sqlite3'),
    mysql   = require('./mysql'),
    pgsql   = require('./pgsql');

function addTableColumn(tablename, table, columnname) {
    var column;
    // creation distinguishes between text with fieldtype, string with maxlength and all others
    if (schema[tablename][columnname].type === 'text' && schema[tablename][columnname].hasOwnProperty('fieldtype')) {
        column = table[schema[tablename][columnname].type](columnname, schema[tablename][columnname].fieldtype);
    } else if (schema[tablename][columnname].type === 'string' && schema[tablename][columnname].hasOwnProperty('maxlength')) {
        column = table[schema[tablename][columnname].type](columnname, schema[tablename][columnname].maxlength);
    } else {
        column = table[schema[tablename][columnname].type](columnname);
    }

    if (schema[tablename][columnname].hasOwnProperty('nullable') && schema[tablename][columnname].nullable === true) {
        column.nullable();
    } else {
        column.notNullable();
    }
    if (schema[tablename][columnname].hasOwnProperty('primary') && schema[tablename][columnname].primary === true) {
        column.primary();
    }
    if (schema[tablename][columnname].hasOwnProperty('unique') && schema[tablename][columnname].unique) {
        column.unique();
    }
    if (schema[tablename][columnname].hasOwnProperty('unsigned') && schema[tablename][columnname].unsigned) {
        column.unsigned();
    }
    if (schema[tablename][columnname].hasOwnProperty('references')) {
        //check if table exists?
        column.references(schema[tablename][columnname].references);
    }
    if (schema[tablename][columnname].hasOwnProperty('defaultTo')) {
        column.defaultTo(schema[tablename][columnname].defaultTo);
    }
}

function addColumn(table, column) {
    return knex.schema.table(table, function (t) {
        addTableColumn(table, t, column);
    });
}

function addUnique(table, column) {
    return knex.schema.table(table, function (table) {
        table.unique(column);
    });
}

function dropUnique(table, column) {
    return knex.schema.table(table, function (table) {
        table.dropUnique(column);
    });
}

function createTable(table) {
    return knex.schema.createTable(table, function (t) {
        var columnKeys = _.keys(schema[table]);
        _.each(columnKeys, function (column) {
            return addTableColumn(table, t, column);
        });
    });
}

function deleteTable(table) {
    return knex.schema.dropTableIfExists(table);
}

function getTables() {
    if (client === 'sqlite3') {
        return sqlite3.getTables();
    }
    if (client === 'mysql') {
        return mysql.getTables();
    }
    if (client === 'pg') {
        return pgsql.getTables();
    }
    return when.reject("No support for database client " + client);
}

function getIndexes(table) {
    if (client === 'sqlite3') {
        return sqlite3.getIndexes(table);
    }
    if (client === 'mysql') {
        return mysql.getIndexes(table);
    }
    if (client === 'pg') {
        return pgsql.getIndexes(table);
    }
    return when.reject("No support for database client " + client);
}

function getColumns(table) {
    if (client === 'sqlite3') {
        return sqlite3.getColumns(table);
    }
    if (client === 'mysql') {
        return mysql.getColumns(table);
    }
    if (client === 'pg') {
        return pgsql.getColumns(table);
    }
    return when.reject("No support for database client " + client);
}

module.exports = {
    createTable: createTable,
    deleteTable: deleteTable,
    getTables: getTables,
    getIndexes: getIndexes,
    addUnique: addUnique,
    dropUnique: dropUnique,
    addColumn: addColumn,
    getColumns: getColumns
};
