const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

// llms_enabled defaults to "true" in default-settings.json, so brand-new
// sites get the feature switched on. This migration only runs when an
// existing site upgrades (fresh installs stamp migrations as complete
// without executing them), so it flips the setting off for sites that
// predate the feature being on by default — leaving new sites untouched.
module.exports = createTransactionalMigration(
    async function up(knex) {
        const setting = await knex('settings')
            .where({key: 'llms_enabled'})
            .first();

        if (!setting) {
            logging.warn('llms_enabled setting not found, skipping migration');
            return;
        }

        // Previous default is "true". If a site has already chosen a value
        // we don't want to overwrite it.
        if (setting.value !== 'true') {
            logging.info('llms_enabled setting is not the previous default of "true", skipping migration');
            return;
        }

        logging.info('Disabling llms_enabled for existing site');
        await knex('settings')
            .where({key: 'llms_enabled'})
            .update({value: 'false'});
    },
    async function down() {
        // no-op: we can't tell a later explicit "false" apart from the value
        // set here, so re-enabling could overwrite a deliberate choice
    }
);
