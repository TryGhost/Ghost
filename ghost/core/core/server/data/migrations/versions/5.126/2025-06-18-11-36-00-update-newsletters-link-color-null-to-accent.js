const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

// newsletters.link_color was supposed to have a default value of 'accent' to match pre-emailCustomization behaviour
// this migration changes previous default of NULL to 'accent' for all existing newsletters so we don't introduce unexpected changes
module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Changing newsletters.link_color from NULL to "accent"');
        await knex('newsletters')
            .whereNull('link_color')
            .update({link_color: 'accent'});
    },
    async function down() {
        // we don't know if a link color was intentionally set to 'accent'
        // and the setting hasn't been used before so we don't change any data
    }
);