const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        // The 'none' value is no longer supported/used
        logging.info(`Updating posts with email_recipient_filter 'none' to 'all' and newsletter_id to null`);

        const affectedRows = await knex('posts')
            .update({
                email_recipient_filter: 'all',
                newsletter_id: null
            })
            .where('email_recipient_filter', 'none');

        logging.info(`Updated ${affectedRows} posts' email_recipient_filter to 'all' and newsletter_id to null`);
    },
    async function down(knex) {
        // In previous versions, none meant that no email was sent.
        logging.info(`Updating posts' email_recipient_filter to 'none' if they have no newsletter`);

        const affectedRows = await knex('posts')
            .update('email_recipient_filter', 'none')
            .where('newsletter_id', null);

        logging.info(`Updated ${affectedRows} posts' email_recipient_filter to 'none'`);
    }
);
