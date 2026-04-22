const logging = require('@tryghost/logging');
const {MigrationError} = require('@tryghost/errors');
const {createTransactionalMigration} = require('../../utils');

const DEFAULT_SLUG = 'default-automated-email';

module.exports = createTransactionalMigration(
    async function up(knex) {
        const existingWelcomeEmail = await knex('welcome_email_automations')
            .first('id');

        if (!existingWelcomeEmail) {
            logging.info('No welcome email automations found, leaving default header fields enabled');
            return;
        }

        const defaultEmailDesignSetting = await knex('email_design_settings')
            .where({slug: DEFAULT_SLUG})
            .first();

        if (!defaultEmailDesignSetting) {
            throw new MigrationError({
                message: `Missing default email_design_settings row for slug: ${DEFAULT_SLUG}`
            });
        }

        logging.info('Disabling default welcome email publication title and icon for existing sites');

        await knex('email_design_settings')
            .where({id: defaultEmailDesignSetting.id})
            .update({
                show_header_title: false,
                show_header_icon: false
            });
    },
    async function down() {
        // no-op: we don't want to re-enable these fields and overwrite later user choices
    }
);
