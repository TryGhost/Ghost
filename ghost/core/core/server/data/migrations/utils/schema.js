const logging = require('@tryghost/logging');
const {commands} = require('../../schema');
const DatabaseInfo = require('@tryghost/database-info');
const db = require('../../db');

const {createNonTransactionalMigration, createTransactionalMigration} = require('./migrations');

/**
 * Builds a migration that runs inside a transaction on MySQL but NOT on SQLite.
 *
 * SQLite implements a column nullability change by rebuilding the whole table,
 * which requires toggling `PRAGMA foreign_keys` — and that pragma is a no-op once
 * a transaction is open. So on SQLite the migration must run non-transactionally
 * (see applyNullableChange). MySQL alters the column in place and keeps the
 * transaction it has always used.
 *
 * @param {(connection: import('knex').Knex) => Promise<void>} up
 * @param {(connection: import('knex').Knex) => Promise<void>} down
 * @returns {Migration}
 */
function createNullableMigration(up, down) {
    const transaction = !DatabaseInfo.isSQLite(db.knex);

    return {
        config: {
            transaction
        },
        async up(config) {
            await up(config.transacting || config.connection);
        },
        async down(config) {
            await down(config.transacting || config.connection);
        }
    };
}

/**
 * @param {string} table
 * @param {string} column
 * @param {Object} columnDefinition
 *
 * @returns {Migration}
 */
function createAddColumnMigration(table, column, columnDefinition, options = {}) {
    return createNonTransactionalMigration(
        // up
        commands.createColumnMigration({
            table,
            column,
            dbIsInCorrectState: hasColumn => hasColumn === true,
            operation: commands.addColumn,
            operationVerb: 'Adding',
            columnDefinition,
            options
        }),
        // down
        commands.createColumnMigration({
            table,
            column,
            dbIsInCorrectState: hasColumn => hasColumn === false,
            operation: commands.dropColumn,
            operationVerb: 'Removing',
            columnDefinition,
            options
        })
    );
}

/**
 * @param {string} table
 * @param {string} column
 * @param {Object} columnDefinition
 *
 * @returns {Migration}
 */
function createDropColumnMigration(table, column, columnDefinition, options = {}) {
    return createNonTransactionalMigration(
        // up
        commands.createColumnMigration({
            table,
            column,
            dbIsInCorrectState: hasColumn => hasColumn === false,
            operation: commands.dropColumn,
            operationVerb: 'Removing',
            columnDefinition,
            options
        }),
        // down
        commands.createColumnMigration({
            table,
            column,
            dbIsInCorrectState: hasColumn => hasColumn === true,
            operation: commands.addColumn,
            operationVerb: 'Adding',
            columnDefinition,
            options
        })
    );
}

/**
 * Applies a column nullability change, disabling foreign key checks around it in
 * the way each database engine requires.
 *
 * SQLite implements a nullability change by rebuilding the whole table (create a
 * temp table -> copy data -> DROP the original -> rename). That DROP fails on a
 * table that other tables reference (e.g. `members`) unless foreign keys are
 * disabled first. `PRAGMA foreign_keys` is a no-op once a transaction is open, so
 * the SQLite migration runs non-transactionally (see createNullableMigration) and
 * we toggle the pragma directly on the connection. The better-sqlite3 pool is
 * fixed at a single connection, so the pragma applies to the same connection that
 * runs the rebuild.
 *
 * MySQL alters the column in place inside the migration's transaction, so `knex`
 * here is already that transaction. We only disable foreign key checks when the
 * caller opts in; running `SET FOREIGN_KEY_CHECKS` on the transaction keeps it on
 * the same connection as the ALTER.
 *
 * @param {import('knex').Knex} knex
 * @param {'setNullable'|'dropNullable'} operation
 * @param {string} table
 * @param {string} column
 * @param {boolean} [disableForeignKeyChecks] MySQL only; ignored on SQLite
 */
async function applyNullableChange(knex, operation, table, column, disableForeignKeyChecks = false) {
    if (DatabaseInfo.isSQLite(knex)) {
        await knex.raw('PRAGMA foreign_keys = OFF;');
        try {
            await commands[operation](table, column, knex);
        } finally {
            await knex.raw('PRAGMA foreign_keys = ON;');
        }
    } else if (disableForeignKeyChecks) {
        await knex.raw('SET FOREIGN_KEY_CHECKS=0;');
        try {
            await commands[operation](table, column, knex);
        } finally {
            await knex.raw('SET FOREIGN_KEY_CHECKS=1;');
        }
    } else {
        await commands[operation](table, column, knex);
    }
}

/**
 * @param {string} table
 * @param {string} column
 * @param {Object} options
 * @param {boolean} options.disableForeignKeyChecks Disable foreign key checks for the down operation (when dropping nullable)
 * @returns {Migration}
 */
function createSetNullableMigration(table, column, options = {}) {
    return createNullableMigration(
        async function up(knex) {
            try {
                // Check if column is already nullable
                const isNullable = await isColumnNullable(table, column, knex);
                if (isNullable) {
                    logging.warn(`Setting nullable: ${table}.${column} - skipping as column is already nullable`);
                    return;
                }
            } catch (error) {
                // If we can't check the column status, proceed with the migration
                // This maintains backward compatibility with implementation before checks were added
                logging.warn(`Could not check nullable status for ${table}.${column}, proceeding with migration: ${error.message}`);
            }

            logging.info(`Setting nullable: ${table}.${column}`);
            await applyNullableChange(knex, 'setNullable', table, column);
        },
        async function down(knex) {
            try {
                // Check if column is already not nullable
                const isNotNullable = await isColumnNotNullable(table, column, knex);
                if (isNotNullable) {
                    logging.warn(`Dropping nullable: ${table}.${column} - skipping as column is already not nullable`);
                    return;
                }
            } catch (error) {
                // If we can't check the column status, proceed with the migration
                // This maintains backward compatibility with implementation before checks were added
                logging.warn(`Could not check nullable status for ${table}.${column}, proceeding with migration: ${error.message}`);
            }

            logging.info(`Dropping nullable: ${table}.${column}${options.disableForeignKeyChecks ? ' with foreign keys disabled' : ''}`);
            await applyNullableChange(knex, 'dropNullable', table, column, options.disableForeignKeyChecks);
        }
    );
}

/**
 * @param {string} table
 * @param {string[]|string} columns One or multiple columns (in case the index should be for multiple columns)
 * @param {object} [options]
 * @param {number} [options.length] MySQL only: create a prefix index of this many characters
 * @returns {Migration}
 */
function createAddIndexMigration(table, columns, options = {}) {
    return createTransactionalMigration(
        async function up(knex) {
            await commands.addIndex(table, columns, knex, options);
        },
        async function down(knex) {
            await commands.dropIndex(table, columns, knex);
        }
    );
}

/**
 * @param {string} table
 * @param {string} from
 * @param {string} to
 *
 * @returns {Migration}
 */
function createRenameColumnMigration(table, from, to) {
    return createNonTransactionalMigration(
        async function up(knex) {
            const hasColumn = await knex.schema.hasColumn(table, to);
            if (hasColumn) {
                logging.warn(`Renaming ${table}.${from} to ${table}.${to} column - skipping as column ${table}.${to} already exists`);
            } else {
                await commands.renameColumn(table, from, to, knex);
            }
        },
        async function down(knex) {
            const hasColumn = await knex.schema.hasColumn(table, from);
            if (hasColumn) {
                logging.warn(`Renaming ${table}.${to} to ${table}.${from} column - skipping as column ${table}.${from} already exists`);
            } else {
                await commands.renameColumn(table, to, from, knex);
            }
        }
    );
}

/**
 * Check if a column is already not nullable
 * @param {string} table
 * @param {string} column
 * @param {import('knex').Knex} knex
 * @returns {Promise<boolean>}
 */
async function isColumnNotNullable(table, column, knex) {
    if (DatabaseInfo.isSQLite(knex)) {
        const response = await knex.raw('PRAGMA table_info(??)', [table]);
        const columnInfo = response.find(col => col.name === column);
        return columnInfo && columnInfo.notnull === 1;
    } else {
        const response = await knex.raw('SHOW COLUMNS FROM ??', [table]);
        const columnInfo = response[0].find(col => col.Field === column);
        return columnInfo && columnInfo.Null === 'NO';
    }
}

/**
 * Check if a column is already nullable
 * @param {string} table
 * @param {string} column
 * @param {import('knex').Knex} knex
 * @returns {Promise<boolean>}
 */
async function isColumnNullable(table, column, knex) {
    if (DatabaseInfo.isSQLite(knex)) {
        const response = await knex.raw('PRAGMA table_info(??)', [table]);
        const columnInfo = response.find(col => col.name === column);
        return columnInfo && columnInfo.notnull === 0;
    } else {
        const response = await knex.raw('SHOW COLUMNS FROM ??', [table]);
        const columnInfo = response[0].find(col => col.Field === column);
        return columnInfo && columnInfo.Null === 'YES';
    }
}

/**
 * @param {string} table
 * @param {string} column
 * @param {Object} options
 * @param {boolean} options.disableForeignKeyChecks Disable foreign key checks for the up operation (when dropping nullable)
 * @returns {Migration}
 */
function createDropNullableMigration(table, column, options = {}) {
    return createNullableMigration(
        async function up(knex) {
            try {
                // Check if column is already not nullable
                const isNotNullable = await isColumnNotNullable(table, column, knex);
                if (isNotNullable) {
                    logging.warn(`Dropping nullable: ${table}.${column} - skipping as column is already not nullable`);
                    return;
                }
            } catch (error) {
                // If we can't check the column status, proceed with the migration
                // This maintains backward compatibility with implementation before checks were added
                logging.warn(`Could not check nullable status for ${table}.${column}, proceeding with migration: ${error.message}`);
            }

            logging.info(`Dropping nullable: ${table}.${column}${options.disableForeignKeyChecks ? ' with foreign keys disabled' : ''}`);
            await applyNullableChange(knex, 'dropNullable', table, column, options.disableForeignKeyChecks);
        },
        async function down(knex) {
            try {
                // Check if column is already nullable
                const isNullable = await isColumnNullable(table, column, knex);
                if (isNullable) {
                    logging.warn(`Setting nullable: ${table}.${column} - skipping as column is already nullable`);
                    return;
                }
            } catch (error) {
                // If we can't check the column status, proceed with the migration
                // This maintains backward compatibility with implementation before checks were added
                logging.warn(`Could not check nullable status for ${table}.${column}, proceeding with migration: ${error.message}`);
            }

            logging.info(`Setting nullable: ${table}.${column}`);
            await applyNullableChange(knex, 'setNullable', table, column);
        }
    );
}

module.exports = {
    createAddColumnMigration,
    createDropColumnMigration,
    createSetNullableMigration,
    createDropNullableMigration,
    createRenameColumnMigration,
    createAddIndexMigration
};

/**
 * @typedef {Object} TransactionalMigrationFunctionOptions
 *
 * @prop {import('knex').Knex} transacting
 */

/**
 * @typedef {(options: TransactionalMigrationFunctionOptions) => Promise<void>} TransactionalMigrationFunction
 */

/**
 * @typedef {Object} Migration
 *
 * @prop {Object} config
 * @prop {boolean} config.transaction
 *
 * @prop {TransactionalMigrationFunction} up
 * @prop {TransactionalMigrationFunction} down
 */
