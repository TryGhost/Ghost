var _       = require('lodash'),
    Promise = require('bluebird'),
    i18n    = require('../../i18n'),
    db      = require('../db'),
    schema  = require('./schema'),
    clients = require('./clients');

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
    return db.knex.schema.table(table, function (t) {
        addTableColumn(table, t, column);
    });
}

function dropColumn(table, column) {
    return db.knex.schema.table(table, function (table) {
        table.dropColumn(column);
    });
}

function addUnique(table, column) {
    return db.knex.schema.table(table, function (table) {
        table.unique(column);
    });
}

function dropUnique(table, column) {
    return db.knex.schema.table(table, function (table) {
        table.dropUnique(column);
    });
}

function createTable(table) {
    return db.knex.schema.createTable(table, function (t) {
        var columnKeys = _.keys(schema[table]);
        _.each(columnKeys, function (column) {
            return addTableColumn(table, t, column);
        });
    });
}

function deleteTable(table) {
    return db.knex.schema.dropTableIfExists(table);
}

function getTables() {
    var client = db.knex.client.config.client;

    if (_.contains(_.keys(clients), client)) {
        return clients[client].getTables();
    }

    return Promise.reject(i18n.t('notices.data.utils.index.noSupportForDatabase', {client: client}));
}

function getIndexes(table) {
    var client = db.knex.client.config.client;

    if (_.contains(_.keys(clients), client)) {
        return clients[client].getIndexes(table);
    }

    return Promise.reject(i18n.t('notices.data.utils.index.noSupportForDatabase', {client: client}));
}

function getColumns(table) {
    var client = db.knex.client.config.client;

    if (_.contains(_.keys(clients), client)) {
        return clients[client].getColumns(table);
    }

    return Promise.reject(i18n.t('notices.data.utils.index.noSupportForDatabase', {client: client}));
}

function checkTables() {
    var client = db.knex.client.config.client;

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
    dropColumn: dropColumn,
    getColumns: getColumns
};
