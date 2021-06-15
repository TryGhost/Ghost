const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up() {},

    async function down(connection) {
        logging.info('Setting "send_email_when_published" based on "email_recipient_filter"');
        await connection('posts')
            .update({
                send_email_when_published: true
            })
            .whereNot({
                email_recipient_filter: 'none'
            });

        await connection('posts')
            .update({
                send_email_when_published: false
            })
            .where({
                email_recipient_filter: 'none'
            });
    }
);
