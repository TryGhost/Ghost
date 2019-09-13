var _ = require('lodash'),
    Promise = require('bluebird'),
    common = require('../../lib/common'),
    db = require('../db'),
    schema = require('./schema'),
    clients = require('./clients');

function addTableColumn(tableName, table, columnName, columnSpec = schema[tableName][columnName]) {
    var column;

    // creation distinguishes between text with fieldtype, string with maxlength and all others
    if (columnSpec.type === 'text' && Object.prototype.hasOwnProperty.call(columnSpec, 'fieldtype')) {
        column = table[columnSpec.type](columnName, columnSpec.fieldtype);
    } else if (columnSpec.type === 'string') {
        if (Object.prototype.hasOwnProperty.call(columnSpec, 'maxlength')) {
            column = table[columnSpec.type](columnName, columnSpec.maxlength);
        } else {
            column = table[columnSpec.type](columnName, 191);
        }
    } else {
        column = table[columnSpec.type](columnName);
    }

    if (Object.prototype.hasOwnProperty.call(columnSpec, 'nullable') && columnSpec.nullable === true) {
        column.nullable();
    } else {
        column.nullable(false);
    }
    if (Object.prototype.hasOwnProperty.call(columnSpec, 'primary') && columnSpec.primary === true) {
        column.primary();
    }
    if (Object.prototype.hasOwnProperty.call(columnSpec, 'unique') && columnSpec.unique) {
        column.unique();
    }
    if (Object.prototype.hasOwnProperty.call(columnSpec, 'unsigned') && columnSpec.unsigned) {
        column.unsigned();
    }
    if (Object.prototype.hasOwnProperty.call(columnSpec, 'references')) {
        // check if table exists?
        column.references(columnSpec.references);
    }
    if (Object.prototype.hasOwnProperty.call(columnSpec, 'defaultTo')) {
        column.defaultTo(columnSpec.defaultTo);
    }
    if (Object.prototype.hasOwnProperty.call(columnSpec, 'index') && columnSpec.index === true) {
        column.index();
    }
}

function addColumn(tableName, column, transaction, columnSpec) {
    return (transaction || db.knex).schema.table(tableName, function (table) {
        addTableColumn(tableName, table, column, columnSpec);
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

const createLog = type => msg => common.logging[type](msg);

function createColumnMigration(...migrations) {
    async function runColumnMigration(conn, migration) {
        const {
            table,
            column,
            dbIsInCorrectState,
            operation,
            operationVerb,
            columnDefinition
        } = migration;

        const hasColumn = await conn.schema.hasColumn(table, column);
        const isInCorrectState = dbIsInCorrectState(hasColumn);

        const log = createLog(isInCorrectState ? 'warn' : 'info');

        log(`${operationVerb} ${table}.${column}`);

        if (!isInCorrectState) {
            await operation(table, column, conn, columnDefinition);
        }
    }

    return async function columnMigration(options) {
        const conn = options.transacting || options.connection;

        for (const migration of migrations) {
            await runColumnMigration(conn, migration);
        }
    };
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
    getColumns: getColumns,
    createColumnMigration
};
