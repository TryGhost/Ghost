const {MigrationError} = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

const DEFAULT_SLUG = 'default-automated-email';

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Backfilling automated_emails.email_design_setting_id');

        const defaultEmailDesignSetting = await knex('email_design_settings')
            .where({slug: DEFAULT_SLUG})
            .first();

        if (!defaultEmailDesignSetting) {
            throw new MigrationError({
                message: `Missing default email_design_settings row for slug: ${DEFAULT_SLUG}`
            });
        }

        await knex('automated_emails')
            .whereNull('email_design_setting_id')
            .update({
                email_design_setting_id: defaultEmailDesignSetting.id
            });
    },
    async function down(knex) {
        logging.info('Reverting automated_emails.email_design_setting_id backfill');

        const defaultEmailDesignSetting = await knex('email_design_settings')
            .where({slug: DEFAULT_SLUG})
            .first();

        if (!defaultEmailDesignSetting) {
            logging.warn(`Default email_design_settings row not found for slug: ${DEFAULT_SLUG} — skipping revert`);
            return;
        }

        await knex('automated_emails')
            .where({email_design_setting_id: defaultEmailDesignSetting.id})
            .update({
                email_design_setting_id: null
            });
    }
);
