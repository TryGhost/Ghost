const logging = require('@tryghost/logging');
const {commands} = require('../../../schema');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const recipientsTableExists = await knex.schema.hasTable('automated_email_recipients');
        if (!recipientsTableExists) {
            logging.warn('Skipping foreign key migration - automated_email_recipients table does not exist');
            return;
        }

        const oldTableExists = await knex.schema.hasTable('automated_emails');
        if (!oldTableExists) {
            logging.warn('Skipping foreign key migration - automated_emails table does not exist');
            return;
        }

        const newTableExists = await knex.schema.hasTable('welcome_email_automated_emails');
        if (!newTableExists) {
            logging.warn('Skipping foreign key migration - welcome_email_automated_emails table does not exist');
            return;
        }

        logging.info('Updating foreign key on automated_email_recipients');
        await commands.dropForeign({
            fromTable: 'automated_email_recipients',
            fromColumn: 'automated_email_id',
            toTable: 'automated_emails',
            toColumn: 'id',
            transaction: knex
        });

        await commands.addForeign({
            fromTable: 'automated_email_recipients',
            fromColumn: 'automated_email_id',
            toTable: 'welcome_email_automated_emails',
            toColumn: 'id',
            transaction: knex
        });
    },

    async function down(knex) {
        const recipientsTableExists = await knex.schema.hasTable('automated_email_recipients');
        if (!recipientsTableExists) {
            logging.warn('Skipping foreign key rollback - automated_email_recipients table does not exist');
            return;
        }

        const oldTableExists = await knex.schema.hasTable('automated_emails');
        if (!oldTableExists) {
            logging.warn('Skipping foreign key rollback - automated_emails table does not exist');
            return;
        }

        const newTableExists = await knex.schema.hasTable('welcome_email_automated_emails');
        if (!newTableExists) {
            logging.warn('Skipping foreign key rollback - welcome_email_automated_emails table does not exist');
            return;
        }

        logging.info('Restoring foreign key on automated_email_recipients');
        await commands.dropForeign({
            fromTable: 'automated_email_recipients',
            fromColumn: 'automated_email_id',
            toTable: 'welcome_email_automated_emails',
            toColumn: 'id',
            transaction: knex
        });

        await commands.addForeign({
            fromTable: 'automated_email_recipients',
            fromColumn: 'automated_email_id',
            toTable: 'automated_emails',
            toColumn: 'id',
            transaction: knex
        });
    }
);
