const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

const SOURCE_TABLE = 'welcome_email_automated_emails';
const TARGET_TABLE = 'email_design_settings';

/**
 * @param {unknown} value
 * @returns {string}
 */
const normalizeString = value => (typeof value === 'string' ? value.trim() : '');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Moving welcome email sender details to email design settings');

        const rows = await knex(`${SOURCE_TABLE} as welcome_email`)
            .join(`${TARGET_TABLE} as design_setting`, 'welcome_email.email_design_setting_id', 'design_setting.id')
            .select([
                'welcome_email.id as welcome_email_id',
                'welcome_email.email_design_setting_id as email_design_setting_id',
                'welcome_email.sender_name as welcome_email_sender_name',
                'welcome_email.sender_email as welcome_email_sender_email',
                'welcome_email.sender_reply_to as welcome_email_sender_reply_to',
                'design_setting.id as design_setting_id',
                'design_setting.sender_name as design_sender_name',
                'design_setting.sender_email as design_sender_email',
                'design_setting.sender_reply_to as design_sender_reply_to'
            ])
            .orderBy('welcome_email.created_at', 'asc')
            .orderBy('welcome_email.id', 'asc');

        let updateCount = 0;

        // There should only be two rows at max, so this should be safe.
        // eslint-disable-next-line no-restricted-syntax
        for (const row of rows) {
            /** @type {Record<string, string>} */
            const update = {};

            const senderName = normalizeString(row.welcome_email_sender_name);
            if (senderName) {
                update.sender_name = senderName;
            }

            const senderEmail = normalizeString(row.welcome_email_sender_email);
            if (senderEmail) {
                update.sender_email = senderEmail;
            }

            const senderReplyTo = normalizeString(row.welcome_email_sender_reply_to);
            if (senderReplyTo) {
                update.sender_reply_to = senderReplyTo;
            }

            if (!Object.keys(update).length) {
                continue;
            }

            await knex(TARGET_TABLE)
                .where({id: row.design_setting_id})
                .update(update);

            updateCount += 1;
        }

        logging.info(`Moved ${updateCount} email sender detail(s) from ${SOURCE_TABLE} to ${TARGET_TABLE}`);
    },
    async function down() {
        logging.info('Leaving email design setting sender details unchanged');
    }
);
