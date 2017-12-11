var _ = require('lodash'),
    Promise = require('bluebird'),
    common = require('../../lib/common'),
    db = require('../db'),
    schema = require('./schema'),
    clients = require('./clients');

function addTableColumn(tableName, table, columnName) {
    var column,
        columnSpec = schema[tableName][columnName];

    // creation distinguishes between text with fieldtype, string with maxlength and all others
    if (columnSpec.type === 'text' && columnSpec.hasOwnProperty('fieldtype')) {
        column = table[columnSpec.type](columnName, columnSpec.fieldtype);
    } else if (columnSpec.type === 'string') {
        if (columnSpec.hasOwnProperty('maxlength')) {
            column = table[columnSpec.type](columnName, columnSpec.maxlength);
        } else {
            column = table[columnSpec.type](columnName, 191);
        }
    } else {
        column = table[columnSpec.type](columnName);
    }

    if (columnSpec.hasOwnProperty('nullable') && columnSpec.nullable === true) {
        column.nullable();
    } else {
        column.nullable(false);
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

function addColumn(tableName, column, transaction) {
    return (transaction || db.knex).schema.table(tableName, function (table) {
        addTableColumn(tableName, table, column);
    });
}

function dropColumn(table, column, transaction) {
    return (transaction || db.knex).schema.table(table, function (table) {
        table.dropColumn(column);
    });
}

function addUnique(table, column, transaction) {
    return (transaction || db.knex).schema.table(table, function (table) {
        table.unique(column);
    });
}

function dropUnique(table, column, transaction) {
    return (transaction || db.knex).schema.table(table, function (table) {
        table.dropUnique(column);
    });
}

/**
 * https://github.com/tgriesser/knex/issues/1303
 * createTableIfNotExists can throw error if indexes are already in place
 */
function createTable(table, transaction) {
    return (transaction || db.knex).schema.hasTable(table)
        .then(function (exists) {
            if (exists) {
                return;
            }

            return (transaction || db.knex).schema.createTable(table, function (t) {
                var columnKeys = _.keys(schema[table]);
                _.each(columnKeys, function (column) {
                    return addTableColumn(table, t, column);
                });
            });
        });
}

function deleteTable(table, transaction) {
    return (transaction || db.knex).schema.dropTableIfExists(table);
}

function getTables(transaction) {
    var client = (transaction || db.knex).client.config.client;

    if (_.includes(_.keys(clients), client)) {
        return clients[client].getTables(transaction);
    }

    return Promise.reject(common.i18n.t('notices.data.utils.index.noSupportForDatabase', {client: client}));
}

function getIndexes(table, transaction) {
    var client = (transaction || db.knex).client.config.client;

    if (_.includes(_.keys(clients), client)) {
        return clients[client].getIndexes(table, transaction);
    }

    return Promise.reject(common.i18n.t('notices.data.utils.index.noSupportForDatabase', {client: client}));
}

function getColumns(table, transaction) {
    var client = (transaction || db.knex).client.config.client;

    if (_.includes(_.keys(clients), client)) {
        return clients[client].getColumns(table);
    }

    return Promise.reject(common.i18n.t('notices.data.utils.index.noSupportForDatabase', {client: client}));
}

function checkTables(transaction) {
    var client = (transaction || db.knex).client.config.client;

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
