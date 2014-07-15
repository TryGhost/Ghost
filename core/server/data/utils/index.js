var _       = require('lodash'),
    when    = require('when'),
    config  = require('../../config'),
    schema  = require('../schema').tables,
    clients = require('./clients');


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
    return config().database.knex.schema.table(table, function (t) {
        addTableColumn(table, t, column);
    });
}

function addUnique(table, column) {
    return config().database.knex.schema.table(table, function (table) {
        table.unique(column);
    });
}

function dropUnique(table, column) {
    return config().database.knex.schema.table(table, function (table) {
        table.dropUnique(column);
    });
}

function createTable(table) {
    return config().database.knex.schema.createTable(table, function (t) {
        var columnKeys = _.keys(schema[table]);
        _.each(columnKeys, function (column) {
            return addTableColumn(table, t, column);
        });
    });
}

function deleteTable(table) {
    return config().database.knex.schema.dropTableIfExists(table);
}

function getTables() {
    var client = config().database.client;

    if (_.contains(_.keys(clients), client)) {
        return clients[client].getTables();
    }

    return when.reject('No support for database client ' + client);
}

function getIndexes(table) {
    var client = config().database.client;

    if (_.contains(_.keys(clients), client)) {
        return clients[client].getIndexes(table);
    }

    return when.reject('No support for database client ' + client);
}

function getColumns(table) {
    var client = config().database.client;

    if (_.contains(_.keys(clients), client)) {
        return clients[client].getColumns(table);
    }

    return when.reject('No support for database client ' + client);
}

function checkTables() {
    var client = config().database.client;

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
