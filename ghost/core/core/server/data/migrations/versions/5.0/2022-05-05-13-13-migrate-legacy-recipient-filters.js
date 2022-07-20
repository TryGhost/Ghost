const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(transaction) {
        const postsFreeCount = await transaction('posts')
            .where('email_recipient_filter', 'free')
            .update('email_recipient_filter', 'status:free');
        logging.info(`Migrated ${postsFreeCount} posts with 'email_recipient_filter' = 'free' to 'status:free'`);

        const postsPaidCount = await transaction('posts')
            .where('email_recipient_filter', 'paid')
            .update('email_recipient_filter', 'status:-free');
        logging.info(`Migrated ${postsPaidCount} posts with 'email_recipient_filter' = 'paid' to 'status:-free'`);

        const emailsFreeCount = await transaction('emails')
            .where('recipient_filter', 'free')
            .update('recipient_filter', 'status:free');
        logging.info(`Migrated ${emailsFreeCount} emails with 'recipient_filter' = 'free' to 'status:free'`);

        const emailsPaidCount = await transaction('emails')
            .where('recipient_filter', 'paid')
            .update('recipient_filter', 'status:-free');
        logging.info(`Migrated ${emailsPaidCount} emails with 'recipient_filter' = 'paid' to 'status:-free'`);
    },
    async function down() {
        // no-op: we don't want to migrate values back to the old-style
        // when they are supported anyway
    }
);