const _ = require('lodash');
const Promise = require('bluebird');
const {i18n} = require('../../lib/common');
const logging = require('../../../shared/logging');
const db = require('../db');
const schema = require('./schema');
const clients = require('./clients');

function addTableColumn(tableName, table, columnName, columnSpec = schema[tableName][columnName]) {
    let column;

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
    if (Object.prototype.hasOwnProperty.call(columnSpec, 'cascadeDelete') && columnSpec.cascadeDelete === true) {
        column.onDelete('CASCADE');
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

function dropColumn(tableName, column, transaction) {
    return (transaction || db.knex).schema.table(tableName, function (table) {
        table.dropColumn(column);
    });
}

/**
 * Checks if unique index exists in a table over the given columns.
 *
 * @param {string} tableName - name of the table to add unique constraint to
 * @param {string|[string]} columns - column(s) to form unique constraint with
 * @param {Object} transaction - connection object containing knex reference
 * @param {Object} transaction.knex - knex instance
 */
async function hasUnique(tableName, columns, transaction) {
    const knex = (transaction || db.knex);
    const client = knex.client.config.client;
    const columnNames = _.isArray(columns) ? columns.join('_') : columns;
    const constraintName = `${tableName}_${columnNames}_unique`;

    if (client === 'mysql') {
        const dbName = knex.client.config.connection.database;
        const [rawConstraints] = await knex.raw(`
                SELECT CONSTRAINT_NAME
                FROM information_schema.TABLE_CONSTRAINTS
                WHERE 1=1
                AND CONSTRAINT_SCHEMA=:dbName
                AND TABLE_NAME=:tableName
                AND CONSTRAINT_TYPE='UNIQUE'`, {dbName, tableName});
        const dbConstraints = rawConstraints.map(c => c.CONSTRAINT_NAME);

        if (dbConstraints.includes(constraintName)) {
            return true;
        }
    } else {
        const rawConstraints = await knex.raw(`PRAGMA index_list('${tableName}');`);
        const dbConstraints = rawConstraints.map(c => c.name);

        if (dbConstraints.includes(constraintName)) {
            return true;
        }
    }

    return false;
}

/**
 * Adds an unique index to a table over the given columns.
 *
 * @param {string} tableName - name of the table to add unique constraint to
 * @param {string|[string]} columns - column(s) to form unique constraint with
 * @param {Object} transaction - connection object containing knex reference
 * @param {Object} transaction.knex - knex instance
 */
async function addUnique(tableName, columns, transaction) {
    const hasUniqueConstraint = await hasUnique(tableName, columns, transaction);

    if (!hasUniqueConstraint) {
        logging.info(`Adding unique constraint for: ${columns} in table ${tableName}`);
        return (transaction || db.knex).schema.table(tableName, function (table) {
            table.unique(columns);
        });
    } else {
        logging.warn(`Constraint for: ${columns} already exists for table: ${tableName}`);
    }
}

/**
 * Drops a unique key constraint from a table.
 *
 * @param {string} tableName - name of the table to drop unique constraint from
 * @param {string|[string]} columns - column(s) unique constraint was formed
 * @param {Object} transaction - connection object containing knex reference
 * @param {Object} transaction.knex - knex instance
 */
async function dropUnique(tableName, columns, transaction) {
    const hasUniqueConstraint = await hasUnique(tableName, columns, transaction);

    if (hasUniqueConstraint) {
        logging.info(`Dropping unique constraint for: ${columns} in table: ${tableName}`);
        return (transaction || db.knex).schema.table(tableName, function (table) {
            table.dropUnique(columns);
        });
    } else {
        logging.warn(`Constraint for: ${columns} does not exist for table: ${tableName}`);
    }
}

/**
 * https://github.com/tgriesser/knex/issues/1303
 * createTableIfNotExists can throw error if indexes are already in place
 */
function createTable(table, transaction, tableSpec = schema[table]) {
    return (transaction || db.knex).schema.hasTable(table)
        .then(function (exists) {
            if (exists) {
                return;
            }

            return (transaction || db.knex).schema.createTable(table, function (t) {
                Object.keys(tableSpec)
                    .filter(column => !(column.startsWith('@@')))
                    .forEach(column => addTableColumn(table, t, column, tableSpec[column]));

                if (tableSpec['@@INDEXES@@']) {
                    tableSpec['@@INDEXES@@'].forEach(index => t.index(index));
                }
                if (tableSpec['@@UNIQUE_CONSTRAINTS@@']) {
                    tableSpec['@@UNIQUE_CONSTRAINTS@@'].forEach(unique => t.unique(unique));
                }
            });
        });
}

function deleteTable(table, transaction) {
    return (transaction || db.knex).schema.dropTableIfExists(table);
}

function getTables(transaction) {
    const client = (transaction || db.knex).client.config.client;

    if (_.includes(_.keys(clients), client)) {
        return clients[client].getTables(transaction);
    }

    return Promise.reject(i18n.t('notices.data.utils.index.noSupportForDatabase', {client: client}));
}

function getIndexes(table, transaction) {
    const client = (transaction || db.knex).client.config.client;

    if (_.includes(_.keys(clients), client)) {
        return clients[client].getIndexes(table, transaction);
    }

    return Promise.reject(i18n.t('notices.data.utils.index.noSupportForDatabase', {client: client}));
}

function getColumns(table, transaction) {
    const client = (transaction || db.knex).client.config.client;

    if (_.includes(_.keys(clients), client)) {
        return clients[client].getColumns(table);
    }

    return Promise.reject(i18n.t('notices.data.utils.index.noSupportForDatabase', {client: client}));
}

function checkTables(transaction) {
    const client = (transaction || db.knex).client.config.client;

    if (client === 'mysql') {
        return clients[client].checkPostTable();
    }
}

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

        if (isInCorrectState) {
            logging.warn(`${operationVerb} ${table}.${column} column - skipping as table is correct`);
        } else {
            logging.info(`${operationVerb} ${table}.${column} column`);
            await operation(table, column, conn, columnDefinition);
        }
    }

    return async function columnMigration(conn) {
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
