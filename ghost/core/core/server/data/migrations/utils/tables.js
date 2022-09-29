const logging = require('@tryghost/logging');
const {commands} = require('../../schema');
const {createIrreversibleMigration, createNonTransactionalMigration} = require('./migrations');

/**
 * Creates a migrations which will add a new table from schema.js to the database
 * @param {string} name - table name
 * @param {Object} tableSpec - copy of table schema definition as defined in schema.js at the moment of writing the migration,
 * this parameter MUST be present, otherwise @daniellockyer will hunt you down
 *
 * @returns {Object} migration object returning config/up/down properties
 */
function addTable(name, tableSpec) {
    return createNonTransactionalMigration(
        async function up(connection) {
            const tableExists = await connection.schema.hasTable(name);
            if (tableExists) {
                logging.warn(`Skipping adding table: ${name} - table already exists`);
                return;
            }

            logging.info(`Adding table: ${name}`);
            return commands.createTable(name, connection, tableSpec);
        },
        async function down(connection) {
            const tableExists = await connection.schema.hasTable(name);
            if (!tableExists) {
                logging.warn(`Skipping dropping table: ${name} - table does not exist`);
                return;
            }

            logging.info(`Dropping table: ${name}`);
            return commands.deleteTable(name, connection);
        }
    );
}

/**
 * Creates migration which will drop a table
 *
 * @param {string[]} names  - names of the tables to drop
 */
function dropTables(names) {
    return createIrreversibleMigration(
        async function up(connection) {
            for (const name of names) {
                const exists = await connection.schema.hasTable(name);

                if (!exists) {
                    logging.warn(`Skipping dropping table: ${name} - table does not exist`);
                } else {
                    logging.info(`Dropping table: ${name}`);
                    await commands.deleteTable(name, connection);
                }
            }
        }
    );
}

/**
 * Creates a migration which will drop an existing table and then re-add a new table based on provided spec
 * @param {string} name - table name
 * @param {Object} tableSpec - copy of table schema definition as defined in schema.js at the moment of writing the migration,
 * this parameter MUST be present, otherwise @daniellockyer will hunt you down
 *
 * @returns {Object} migration object returning config/up/down properties
 */
function recreateTable(name, tableSpec) {
    return createNonTransactionalMigration(
        async function up(connection) {
            const exists = await connection.schema.hasTable(name);

            if (!exists) {
                logging.warn(`Skipping dropping table: ${name} - table does not exist`);
            } else {
                logging.info(`Dropping table: ${name}`);
                await commands.deleteTable(name, connection);
                logging.info(`Re-adding table: ${name}`);
                await commands.createTable(name, connection, tableSpec);
            }
        },
        async function down() {
            // noop: we cannot go back to old table schema
            logging.warn(`Ignoring rollback for table recreate: ${name}`);
            return Promise.resolve();
        }
    );
}

module.exports = {
    addTable,
    dropTables,
    recreateTable
};
