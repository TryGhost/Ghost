const {createTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');

module.exports = createTransactionalMigration(
    async function up(connection) {
        logging.info('Updating email_recipient_filter values based on visibility and send_email_when_published');
        await connection('posts')
            .update('email_recipient_filter', 'paid')
            .where({
                send_email_when_published: true,
                visibility: 'paid'
            });

        await connection('posts')
            .update('email_recipient_filter', 'all')
            .where({
                send_email_when_published: true,
                visibility: 'members'
            });

        await connection('posts')
            .update('email_recipient_filter', 'all')
            .where({
                send_email_when_published: true,
                visibility: 'public'
            });
    },

    async function down(connection) {
        logging.info('Updating email_recipient_filter values to none');
        await connection('posts')
            .update('email_recipient_filter', 'none');
    }
);
