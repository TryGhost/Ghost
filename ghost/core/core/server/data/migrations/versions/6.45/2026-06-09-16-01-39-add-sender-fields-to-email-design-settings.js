const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addColumn, dropColumn} = require('../../../schema/commands');

const tableName = 'email_design_settings';
const senderColumns = {
    sender_name: {type: 'string', maxlength: 191, nullable: true},
    sender_email: {type: 'string', maxlength: 191, nullable: true},
    sender_reply_to: {type: 'string', maxlength: 191, nullable: true}
};

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        const hasTable = await knex.schema.hasTable(tableName);
        if (!hasTable) {
            logging.warn(`Skipping sender column migration - ${tableName} table does not exist`);
            return;
        }

        for (const [columnName, columnDefinition] of Object.entries(senderColumns)) {
            const hasColumn = await knex.schema.hasColumn(tableName, columnName);
            if (hasColumn) {
                logging.warn(`Adding ${tableName}.${columnName} column - skipping as column already exists`);
                continue;
            }

            logging.info(`Adding ${tableName}.${columnName} column`);
            await addColumn(tableName, columnName, knex, columnDefinition);
        }
    },
    async function down(knex) {
        const hasTable = await knex.schema.hasTable(tableName);
        if (!hasTable) {
            logging.warn(`Skipping sender column rollback - ${tableName} table does not exist`);
            return;
        }

        for (const [columnName, columnDefinition] of Object.entries(senderColumns).reverse()) {
            const hasColumn = await knex.schema.hasColumn(tableName, columnName);
            if (!hasColumn) {
                logging.warn(`Removing ${tableName}.${columnName} column - skipping as column does not exist`);
                continue;
            }

            logging.info(`Removing ${tableName}.${columnName} column`);
            await dropColumn(tableName, columnName, knex, columnDefinition);
        }
    }
);
