const logging = require('@tryghost/logging');

// For DML - data changes
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Setting welcome_page_url from settings');

        const paidSignupRedirect = await knex()
            .select('value')
            .from('settings')
            .where('key', 'members_paid_signup_redirect')
            .first();

        const freeSignupRedirect = await knex()
            .select('value')
            .from('settings')
            .where('key', 'members_free_signup_redirect')
            .first();

        logging.info(`Setting paid Tiers welcome_page_url to ${paidSignupRedirect.value}`);

        await knex('products')
            .update('welcome_page_url', paidSignupRedirect.value)
            .where('type', 'paid');

        logging.info(`Setting free Tiers welcome_page_url to ${freeSignupRedirect.value}`);

        await knex('products')
            .update('welcome_page_url', freeSignupRedirect.value)
            .where('type', 'free');
    },
    async function down(knex) {
        logging.info('Setting welcome_page_url to NULL');
        await knex('products')
            .update('welcome_page_url', null);
    }
);
