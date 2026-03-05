const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Backfilling campaign_type on existing automated_emails rows');

        const freeUpdated = await knex('automated_emails')
            .where('slug', 'member-welcome-email-free')
            .update({
                campaign_type: 'free_signup',
                delay_days: 0,
                sort_order: 0,
                version: 1
            });

        logging.info(`Updated ${freeUpdated} free welcome email row(s)`);

        const paidUpdated = await knex('automated_emails')
            .where('slug', 'member-welcome-email-paid')
            .update({
                campaign_type: 'paid_signup',
                delay_days: 0,
                sort_order: 0,
                version: 1
            });

        logging.info(`Updated ${paidUpdated} paid welcome email row(s)`);
    },

    async function down() {
        logging.info('Reverting campaign_type backfill is not needed - columns will be dropped by their own migration');
    }
);
