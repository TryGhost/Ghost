const logging = require('@tryghost/logging');

// For DML - data changes
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Setting welcome_page_url from settings');

        const paidSignupRedirect = await knex('settings')
            .select('value')
            .where('key', 'members_paid_signup_redirect')
            .first();

        const freeSignupRedirect = await knex('settings')
            .select('value')
            .where('key', 'members_free_signup_redirect')
            .first();

        if (paidSignupRedirect) {
            logging.info(`Setting paid Tiers welcome_page_url to ${paidSignupRedirect.value}`);

            await knex('products')
                .update('welcome_page_url', paidSignupRedirect.value)
                .where('type', 'paid');
        } else {
            logging.info(`No members_paid_signup_redirect setting found`);
        }

        if (freeSignupRedirect) {
            logging.info(`Setting free Tiers welcome_page_url to ${freeSignupRedirect.value}`);

            await knex('products')
                .update('welcome_page_url', freeSignupRedirect.value)
                .where('type', 'free');
        } else {
            logging.info(`No members_free_signup_redirect setting found`);
        }
    },
    async function down(knex) {
        logging.info('Setting welcome_page_url to NULL');
        await knex('products')
            .update('welcome_page_url', null);
    }
);
