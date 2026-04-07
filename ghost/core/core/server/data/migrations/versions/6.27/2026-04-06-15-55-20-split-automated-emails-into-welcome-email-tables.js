const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const ObjectId = require('bson-objectid').default;

module.exports = createTransactionalMigration(
    async function up(knex) {
        // The welcome_email_automations and welcome_email_automated_emails tables
        // already exist from a prior dormant migration. This migration copies data
        // from the old automated_emails table into them.

        const oldTableExists = await knex.schema.hasTable('automated_emails');
        if (!oldTableExists) {
            logging.warn('Skipping data migration - automated_emails table does not exist');
            return;
        }

        const rows = await knex('automated_emails').select('*');
        logging.info(`Migrating ${rows.length} rows from automated_emails to new tables`);

        // Only 2 rows exist (free + paid welcome emails), so sequential iteration is fine
        // eslint-disable-next-line no-restricted-syntax
        for (const row of rows) {
            // Check if already migrated (idempotency) by looking for a matching slug
            const existingAutomation = await knex('welcome_email_automations').where('slug', row.slug).first();
            if (existingAutomation) {
                logging.warn(`Skipping row for slug ${row.slug} - already migrated`);
                continue;
            }

            const automationId = ObjectId().toHexString();

            // Insert automation first (emails reference automations via FK)
            await knex('welcome_email_automations').insert({
                id: automationId,
                status: row.status,
                name: row.name,
                slug: row.slug,
                created_at: row.created_at,
                updated_at: row.updated_at
            });

            // Reuse the original automated_email id so the existing
            // automated_email_recipients rows continue to reference the same id
            await knex('welcome_email_automated_emails').insert({
                id: row.id,
                welcome_email_automation_id: automationId,
                delay_days: 0,
                subject: row.subject,
                lexical: row.lexical,
                sender_name: row.sender_name,
                sender_email: row.sender_email,
                sender_reply_to: row.sender_reply_to,
                email_design_setting_id: row.email_design_setting_id,
                created_at: row.created_at,
                updated_at: row.updated_at
            });
        }
    },

    async function down(knex) {
        // Remove migrated data from new tables
        logging.info('Removing migrated data from new tables');
        await knex('welcome_email_automated_emails').del();
        await knex('welcome_email_automations').del();
    }
);
