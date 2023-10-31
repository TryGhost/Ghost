const logging = require('@tryghost/logging');
const {commands} = require('../../schema');
const DatabaseInfo = require('@tryghost/database-info');

const {createNonTransactionalMigration, createTransactionalMigration} = require('./migrations');

/**
 * @param {string} table
 * @param {string} column
 * @param {Object} columnDefinition
 *
 * @returns {Migration}
 */
function createAddColumnMigration(table, column, columnDefinition) {
    return createNonTransactionalMigration(
        // up
        commands.createColumnMigration({
            table,
            column,
            dbIsInCorrectState: hasColumn => hasColumn === true,
            operation: commands.addColumn,
            operationVerb: 'Adding',
            columnDefinition
        }),
        // down
        commands.createColumnMigration({
            table,
            column,
            dbIsInCorrectState: hasColumn => hasColumn === false,
            operation: commands.dropColumn,
            operationVerb: 'Removing',
            columnDefinition
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
function createDropColumnMigration(table, column, columnDefinition) {
    return createNonTransactionalMigration(
        // up
        commands.createColumnMigration({
            table,
            column,
            dbIsInCorrectState: hasColumn => hasColumn === false,
            operation: commands.dropColumn,
            operationVerb: 'Removing'
        }),
        // down
        commands.createColumnMigration({
            table,
            column,
            dbIsInCorrectState: hasColumn => hasColumn === true,
            operation: commands.addColumn,
            operationVerb: 'Adding',
            columnDefinition
        })
    );
}

/**
 * @param {string} table
 * @param {string} column
 * @param {Object} options
 * @param {boolean} options.disableForeignKeyChecks Disable foreign key checks for the down operation (when dropping nullable)
 * @returns {Migration}
 */
function createSetNullableMigration(table, column, options = {}) {
    return createTransactionalMigration(
        async function up(knex) {
            logging.info(`Setting nullable: ${table}.${column}`);
            await commands.setNullable(table, column, knex);
        },
        async function down(knex) {
            if (DatabaseInfo.isSQLite(knex)) {
                options.disableForeignKeyChecks = false;
            }
            logging.info(`Dropping nullable:  ${table}.${column}${options.disableForeignKeyChecks ? ' with foreign keys disabled' : ''}`);
            if (options.disableForeignKeyChecks) {
                await knex.raw('SET FOREIGN_KEY_CHECKS=0;').transacting(knex);
            }

            try {
                await commands.dropNullable(table, column, knex);
            } finally {
                if (options.disableForeignKeyChecks) {
                    await knex.raw('SET FOREIGN_KEY_CHECKS=1;').transacting(knex);
                }
            }
        }
    );
}

/**
 * @param {string} table
 * @param {string[]|string} columns One or multiple columns (in case the index should be for multiple columns)
 * @returns {Migration}
 */
function createAddIndexMigration(table, columns) {
    return createTransactionalMigration(
        async function up(knex) {
            await commands.addIndex(table, columns, knex);
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
 * @param {string} table
 * @param {string} column
 * @param {Object} options
 * @param {boolean} options.disableForeignKeyChecks Disable foreign key checks for the up operation (when dropping nullable)
 * @returns {Migration}
 */
function createDropNullableMigration(table, column, options = {}) {
    return createTransactionalMigration(
        async function up(knex) {
            if (DatabaseInfo.isSQLite(knex)) {
                options.disableForeignKeyChecks = false;
            }
            logging.info(`Dropping nullable: ${table}.${column}${options.disableForeignKeyChecks ? ' with foreign keys disabled' : ''}`);

            if (options.disableForeignKeyChecks) {
                await knex.raw('SET FOREIGN_KEY_CHECKS=0;').transacting(knex);
            }

            try {
                await commands.dropNullable(table, column, knex);
            } finally {
                if (options.disableForeignKeyChecks) {
                    await knex.raw('SET FOREIGN_KEY_CHECKS=1;').transacting(knex);
                }
            }
        },
        async function down(knex) {
            logging.info(`Setting nullable: ${table}.${column}`);
            await commands.setNullable(table, column, knex);
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
