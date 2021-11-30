const _ = require('lodash');
const Promise = require('bluebird');
const logging = require('@tryghost/logging');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const db = require('../db');
const schema = require('./schema');
const clients = require('./clients');

const messages = {
    hasPrimaryKeySQLiteError: 'Must use hasPrimaryKeySQLite on an SQLite3 database',
    hasForeignSQLite3: 'Must use hasForeignSQLite3 on an SQLite3 database',
    noSupportForDatabase: 'No support for database client {client}'
};

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
 * Adds an unique index to a table over the given columns.
 *
 * @param {string} tableName - name of the table to add unique constraint to
 * @param {string|[string]} columns - column(s) to form unique constraint with
 * @param {import('knex')} transaction - connection object containing knex reference
 */
async function addUnique(tableName, columns, transaction) {
    try {
        logging.info(`Adding unique constraint for: ${columns} in table ${tableName}`);

        return await (transaction || db.knex).schema.table(tableName, function (table) {
            table.unique(columns);
        });
    } catch (err) {
        if (err.code === 'SQLITE_ERROR') {
            logging.warn(`Constraint for: ${columns} already exists for table: ${tableName}`);
            return;
        }
        if (err.code === 'ER_DUP_KEYNAME') {
            logging.warn(`Constraint for: ${columns} already exists for table: ${tableName}`);
            return;
        }
        throw err;
    }
}

/**
 * Drops a unique key constraint from a table.
 *
 * @param {string} tableName - name of the table to drop unique constraint from
 * @param {string|[string]} columns - column(s) unique constraint was formed
 * @param {import('knex')} transaction - connection object containing knex reference
 */
async function dropUnique(tableName, columns, transaction) {
    try {
        logging.info(`Dropping unique constraint for: ${columns} in table: ${tableName}`);

        return await (transaction || db.knex).schema.table(tableName, function (table) {
            table.dropUnique(columns);
        });
    } catch (err) {
        if (err.code === 'SQLITE_ERROR') {
            logging.warn(`Constraint for: ${columns} does not exist for table: ${tableName}`);
            return;
        }
        if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            logging.warn(`Constraint for: ${columns} does not exist for table: ${tableName}`);
            return;
        }
        throw err;
    }
}

/**
 * Checks if a foreign key exists in a table over the given columns.
 *
 * @param {Object} configuration - contains all configuration for this function
 * @param {string} configuration.fromTable - name of the table to add the foreign key to
 * @param {string} configuration.fromColumn - column of the table to add the foreign key to
 * @param {string} configuration.toTable - name of the table to point the foreign key to
 * @param {string} configuration.toColumn - column of the table to point the foreign key to
 * @param {import('knex')} configuration.transaction - connection object containing knex reference
 */
async function hasForeignSQLite({fromTable, fromColumn, toTable, toColumn, transaction}) {
    const knex = (transaction || db.knex);
    const client = knex.client.config.client;

    if (client !== 'sqlite3') {
        throw new errors.InternalServerError({
            message: tpl(messages.hasForeignSQLite3)
        });
    }

    const foreignKeys = await knex.raw(`PRAGMA foreign_key_list('${fromTable}');`);

    const hasForeignKey = foreignKeys.some(foreignKey => foreignKey.table === toTable && foreignKey.from === fromColumn && foreignKey.to === toColumn);

    return hasForeignKey;
}

/**
 * Adds a foreign key to a table.
 *
 * @param {Object} configuration - contains all configuration for this function
 * @param {string} configuration.fromTable - name of the table to add the foreign key to
 * @param {string} configuration.fromColumn - column of the table to add the foreign key to
 * @param {string} configuration.toTable - name of the table to point the foreign key to
 * @param {string} configuration.toColumn - column of the table to point the foreign key to
 * @param {Boolean} configuration.cascadeDelete - adds the "on delete cascade" option if true
 * @param {import('knex')} configuration.transaction - connection object containing knex reference
 */
async function addForeign({fromTable, fromColumn, toTable, toColumn, cascadeDelete = false, transaction}) {
    const isSQLite = db.knex.client.config.client === 'sqlite3';
    if (isSQLite) {
        const foreignKeyExists = await hasForeignSQLite({fromTable, fromColumn, toTable, toColumn, transaction});
        if (foreignKeyExists) {
            logging.warn(`Skipped adding foreign key from ${fromTable}.${fromColumn} to ${toTable}.${toColumn} - foreign key already exists`);
            return;
        }
    }
    try {
        logging.info(`Adding foreign key from ${fromTable}.${fromColumn} to ${toTable}.${toColumn}`);

        //disable and re-enable foreign key checks on sqlite because of https://github.com/knex/knex/issues/4155
        let foreignKeysEnabled;
        if (isSQLite) {
            foreignKeysEnabled = await db.knex.raw('PRAGMA foreign_keys;');
            if (foreignKeysEnabled[0].foreign_keys) {
                await db.knex.raw('PRAGMA foreign_keys = OFF;');
            }
        }

        await (transaction || db.knex).schema.table(fromTable, function (table) {
            if (cascadeDelete) {
                table.foreign(fromColumn).references(`${toTable}.${toColumn}`).onDelete('CASCADE');
            } else {
                table.foreign(fromColumn).references(`${toTable}.${toColumn}`);
            }
        });

        if (isSQLite) {
            if (foreignKeysEnabled[0].foreign_keys) {
                await db.knex.raw('PRAGMA foreign_keys = ON;');
            }
        }
    } catch (err) {
        if (err.code === 'ER_DUP_KEY') {
            logging.warn(`Skipped adding foreign key from ${fromTable}.${fromColumn} to ${toTable}.${toColumn} - foreign key already exists`);
            return;
        }
        throw err;
    }
}

/**
 * Drops a foreign key from a table.
 *
 * @param {Object} configuration - contains all configuration for this function
 * @param {string} configuration.fromTable - name of the table to add the foreign key to
 * @param {string} configuration.fromColumn - column of the table to add the foreign key to
 * @param {string} configuration.toTable - name of the table to point the foreign key to
 * @param {string} configuration.toColumn - column of the table to point the foreign key to
 * @param {import('knex')} configuration.transaction - connection object containing knex reference
 */
async function dropForeign({fromTable, fromColumn, toTable, toColumn, transaction}) {
    const isSQLite = db.knex.client.config.client === 'sqlite3';
    if (isSQLite) {
        const foreignKeyExists = await hasForeignSQLite({fromTable, fromColumn, toTable, toColumn, transaction});
        if (!foreignKeyExists) {
            logging.warn(`Skipped dropping foreign key from ${fromTable}.${fromColumn} to ${toTable}.${toColumn} - foreign key does not exist`);
            return;
        }
    }
    try {
        logging.info(`Dropping foreign key from ${fromTable}.${fromColumn} to ${toTable}.${toColumn}`);

        //disable and re-enable foreign key checks on sqlite because of https://github.com/knex/knex/issues/4155
        let foreignKeysEnabled;
        if (isSQLite) {
            foreignKeysEnabled = await db.knex.raw('PRAGMA foreign_keys;');
            if (foreignKeysEnabled[0].foreign_keys) {
                await db.knex.raw('PRAGMA foreign_keys = OFF;');
            }
        }

        await (transaction || db.knex).schema.table(fromTable, function (table) {
            table.dropForeign(fromColumn);
        });

        if (isSQLite) {
            if (foreignKeysEnabled[0].foreign_keys) {
                await db.knex.raw('PRAGMA foreign_keys = ON;');
            }
        }
    } catch (err) {
        if (err.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
            logging.warn(`Skipped dropping foreign key from ${fromTable}.${fromColumn} to ${toTable}.${toColumn} - foreign key does not exist`);
            return;
        }
        throw err;
    }
}

/**
 * Checks if primary key index exists in a table over the given columns.
 *
 * @param {string} tableName - name of the table to check primary key constraint on
 * @param {import('knex')} transaction - connection object containing knex reference
 */
async function hasPrimaryKeySQLite(tableName, transaction) {
    const knex = (transaction || db.knex);
    const client = knex.client.config.client;

    if (client !== 'sqlite3') {
        throw new errors.InternalServerError({
            message: tpl(messages.hasPrimaryKeySQLiteError)
        });
    }

    const rawConstraints = await knex.raw(`PRAGMA index_list('${tableName}');`);
    const tablePrimaryKey = rawConstraints.find(c => c.origin === 'pk');

    return tablePrimaryKey;
}

/**
 * Adds an primary key index to a table over the given columns.
 *
 * @param {string} tableName - name of the table to add primaykey  constraint to
 * @param {string|[string]} columns - column(s) to form primary key constraint with
 * @param {import('knex')} transaction - connection object containing knex reference
 */
async function addPrimaryKey(tableName, columns, transaction) {
    const isSQLite = db.knex.client.config.client === 'sqlite3';
    if (isSQLite) {
        const primaryKeyExists = await hasPrimaryKeySQLite(tableName, transaction);
        if (primaryKeyExists) {
            logging.warn(`Primary key constraint for: ${columns} already exists for table: ${tableName}`);
            return;
        }
    }
    try {
        logging.info(`Adding primary key constraint for: ${columns} in table ${tableName}`);
        return await (transaction || db.knex).schema.table(tableName, function (table) {
            table.primary(columns);
        });
    } catch (err) {
        if (err.code === 'ER_MULTIPLE_PRI_KEY') {
            logging.warn(`Primary key constraint for: ${columns} already exists for table: ${tableName}`);
            return;
        }
        throw err;
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

    return Promise.reject(tpl(messages.noSupportForDatabase, {client: client}));
}

function getIndexes(table, transaction) {
    const client = (transaction || db.knex).client.config.client;

    if (_.includes(_.keys(clients), client)) {
        return clients[client].getIndexes(table, transaction);
    }

    return Promise.reject(tpl(messages.noSupportForDatabase, {client: client}));
}

function getColumns(table, transaction) {
    const client = (transaction || db.knex).client.config.client;

    if (_.includes(_.keys(clients), client)) {
        return clients[client].getColumns(table);
    }

    return Promise.reject(tpl(messages.noSupportForDatabase, {client: client}));
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
    addPrimaryKey: addPrimaryKey,
    addForeign: addForeign,
    dropForeign: dropForeign,
    addColumn: addColumn,
    dropColumn: dropColumn,
    getColumns: getColumns,
    createColumnMigration,
    // NOTE: below are exposed for testing purposes only
    _hasForeignSQLite: hasForeignSQLite,
    _hasPrimaryKeySQLite: hasPrimaryKeySQLite
};
