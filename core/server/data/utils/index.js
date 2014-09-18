var _       = require('lodash'),
    Promise = require('bluebird'),
    config  = require('../../config'),
    schema  = require('../schema').tables,
    clients = require('./clients'),

    dbConfig;

function addTableColumn(tablename, table, columnname) {
    var column,
        columnSpec = schema[tablename][columnname];

    // creation distinguishes between text with fieldtype, string with maxlength and all others
    if (columnSpec.type === 'text' && columnSpec.hasOwnProperty('fieldtype')) {
        column = table[columnSpec.type](columnname, columnSpec.fieldtype);
    } else if (columnSpec.type === 'string' && columnSpec.hasOwnProperty('maxlength')) {
        column = table[columnSpec.type](columnname, columnSpec.maxlength);
    } else {
        column = table[columnSpec.type](columnname);
    }

    if (columnSpec.hasOwnProperty('nullable') && columnSpec.nullable === true) {
        column.nullable();
    } else {
        column.notNullable();
    }
    if (columnSpec.hasOwnProperty('primary') && columnSpec.primary === true) {
        column.primary();
    }
    if (columnSpec.hasOwnProperty('unique') && columnSpec.unique) {
        column.unique();
    }
    if (columnSpec.hasOwnProperty('unsigned') && columnSpec.unsigned) {
        column.unsigned();
    }
    if (columnSpec.hasOwnProperty('references')) {
        // check if table exists?
        column.references(columnSpec.references);
    }
    if (columnSpec.hasOwnProperty('defaultTo')) {
        column.defaultTo(columnSpec.defaultTo);
    }
}

function addColumn(table, column) {
    dbConfig = dbConfig || config.database;
    return dbConfig.knex.schema.table(table, function (t) {
        addTableColumn(table, t, column);
    });
}

function addUnique(table, column) {
    dbConfig = dbConfig || config.database;
    return dbConfig.knex.schema.table(table, function (table) {
        table.unique(column);
    });
}

function dropUnique(table, column) {
    dbConfig = dbConfig || config.database;
    return dbConfig.knex.schema.table(table, function (table) {
        table.dropUnique(column);
    });
}

function createTable(table) {
    dbConfig = dbConfig || config.database;
    return dbConfig.knex.schema.createTable(table, function (t) {
        var columnKeys = _.keys(schema[table]);
        _.each(columnKeys, function (column) {
            return addTableColumn(table, t, column);
        });
    });
}

function deleteTable(table) {
    dbConfig = dbConfig || config.database;
    return dbConfig.knex.schema.dropTableIfExists(table);
}

function getTables() {
    dbConfig = dbConfig || config.database;
    var client = dbConfig.client;

    if (_.contains(_.keys(clients), client)) {
        return clients[client].getTables();
    }

    return Promise.reject('No support for database client ' + client);
}

function getIndexes(table) {
    dbConfig = dbConfig || config.database;
    var client = dbConfig.client;

    if (_.contains(_.keys(clients), client)) {
        return clients[client].getIndexes(table);
    }

    return Promise.reject('No support for database client ' + client);
}

function getColumns(table) {
    dbConfig = dbConfig || config.database;
    var client = dbConfig.client;

    if (_.contains(_.keys(clients), client)) {
        return clients[client].getColumns(table);
    }

    return Promise.reject('No support for database client ' + client);
}

function checkTables() {
    dbConfig = dbConfig || config.database;
    var client = dbConfig.client;

    if (client === 'mysql') {
        return clients[client].checkPostTable();
    }
}

module.exports = {
    checkTables: checkTables,
    createTable: createTable,
    deleteTable: deleteTable,
    getTables: getTables,
    getIndexes: getIndexes,
    addUnique: addUnique,
    dropUnique: dropUnique,
    addColumn: addColumn,
    getColumns: getColumns
};
