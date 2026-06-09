const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addColumn, dropColumn} = require('../../../schema/commands');

const welcomeEmailTable = 'welcome_email_automated_emails';
const designTable = 'email_design_settings';
const senderColumns = {
    sender_name: {type: 'string', maxlength: 191, nullable: true},
    sender_email: {type: 'string', maxlength: 191, nullable: true},
    sender_reply_to: {type: 'string', maxlength: 191, nullable: true}
};

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        const hasTable = await knex.schema.hasTable(welcomeEmailTable);
        if (!hasTable) {
            logging.warn(`Skipping sender column removal - ${welcomeEmailTable} table does not exist`);
            return;
        }

        for (const [columnName, columnDefinition] of Object.entries(senderColumns).reverse()) {
            const hasColumn = await knex.schema.hasColumn(welcomeEmailTable, columnName);
            if (!hasColumn) {
                logging.warn(`Removing ${welcomeEmailTable}.${columnName} column - skipping as column does not exist`);
                continue;
            }

            logging.info(`Removing ${welcomeEmailTable}.${columnName} column`);
            await dropColumn(welcomeEmailTable, columnName, knex, columnDefinition);
        }
    },
    async function down(knex) {
        const hasWelcomeEmailTable = await knex.schema.hasTable(welcomeEmailTable);
        if (!hasWelcomeEmailTable) {
            logging.warn(`Skipping sender column rollback - ${welcomeEmailTable} table does not exist`);
            return;
        }

        for (const [columnName, columnDefinition] of Object.entries(senderColumns)) {
            const hasColumn = await knex.schema.hasColumn(welcomeEmailTable, columnName);
            if (hasColumn) {
                logging.warn(`Adding ${welcomeEmailTable}.${columnName} column - skipping as column already exists`);
                continue;
            }

            logging.info(`Adding ${welcomeEmailTable}.${columnName} column`);
            await addColumn(welcomeEmailTable, columnName, knex, columnDefinition);
        }

        const hasDesignTable = await knex.schema.hasTable(designTable);
        if (!hasDesignTable) {
            logging.warn(`Skipping sender rollback backfill - ${designTable} table does not exist`);
            return;
        }

        for (const columnName of Object.keys(senderColumns)) {
            const hasDesignColumn = await knex.schema.hasColumn(designTable, columnName);
            if (!hasDesignColumn) {
                logging.warn(`Skipping sender rollback backfill for ${columnName} - ${designTable}.${columnName} column does not exist`);
                return;
            }
        }

        const rows = await knex(`${welcomeEmailTable} as email`)
            .join(`${designTable} as design`, 'design.id', 'email.email_design_setting_id')
            .select(
                'email.id',
                'design.sender_name',
                'design.sender_email',
                'design.sender_reply_to'
            );

        if (rows.length === 0) {
            logging.info(`Skipping sender rollback backfill - no linked ${welcomeEmailTable} rows found`);
            return;
        }

        logging.info(`Backfilling ${rows.length} ${welcomeEmailTable} row(s) from ${designTable}`);
        for (const row of rows) {
            await knex(welcomeEmailTable)
                .where('id', row.id)
                .update({
                    sender_name: row.sender_name,
                    sender_email: row.sender_email,
                    sender_reply_to: row.sender_reply_to
                });
        }
    }
);
