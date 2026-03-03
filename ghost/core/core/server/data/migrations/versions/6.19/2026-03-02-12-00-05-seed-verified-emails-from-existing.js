const logging = require('@tryghost/logging');
const {default: ObjectID} = require('bson-objectid');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const emailsToInsert = new Map(); // email -> id (deduplication)

        // 1. Collect sender_email values from newsletters (where not null)
        const newsletterSenderEmails = await knex('newsletters')
            .select('sender_email')
            .whereNotNull('sender_email')
            .where('sender_email', '!=', '');

        newsletterSenderEmails.reduce((map, row) => {
            const email = row.sender_email.toLowerCase().trim();
            if (email && !map.has(email)) {
                map.set(email, (new ObjectID()).toHexString());
            }
            return map;
        }, emailsToInsert);

        // 2. Collect sender_reply_to values from newsletters
        //    Skip special alias values 'newsletter' and 'support' — these are not email addresses
        const newsletterReplyTos = await knex('newsletters')
            .select('sender_reply_to')
            .whereNotNull('sender_reply_to')
            .where('sender_reply_to', '!=', '')
            .whereNotIn('sender_reply_to', ['newsletter', 'support']);

        newsletterReplyTos.reduce((map, row) => {
            const email = row.sender_reply_to.toLowerCase().trim();
            if (email && !map.has(email)) {
                map.set(email, (new ObjectID()).toHexString());
            }
            return map;
        }, emailsToInsert);

        // 3. Collect members_support_address from settings
        //    Skip 'noreply' (special alias) and values without '@' (not real emails)
        const supportAddressSetting = await knex('settings')
            .select('value')
            .where('key', 'members_support_address')
            .first();

        if (supportAddressSetting && supportAddressSetting.value) {
            const value = supportAddressSetting.value.toLowerCase().trim();
            if (value !== 'noreply' && value.includes('@') && !emailsToInsert.has(value)) {
                emailsToInsert.set(value, (new ObjectID()).toHexString());
            }
        }

        // 4. Insert unique emails into verified_emails with status 'verified'
        if (emailsToInsert.size === 0) {
            logging.info('No existing custom email addresses found to seed into verified_emails');
            return;
        }

        logging.info(`Seeding ${emailsToInsert.size} verified email(s) from existing addresses`);

        const now = knex.raw('CURRENT_TIMESTAMP');
        const rows = Array.from(emailsToInsert, ([email, id]) => ({
            id,
            email,
            status: 'verified',
            created_at: now,
            updated_at: now
        }));

        await knex.batchInsert('verified_emails', rows, 100);

        // 5. Backfill sender_email_verified_email_id on newsletters
        const newslettersWithSenderEmail = await knex('newsletters')
            .select('id', 'sender_email')
            .whereNotNull('sender_email')
            .where('sender_email', '!=', '');

        await Promise.all(newslettersWithSenderEmail.map(async (newsletter) => {
            const email = newsletter.sender_email.toLowerCase().trim();
            const verifiedEmailId = emailsToInsert.get(email);
            if (verifiedEmailId) {
                await knex('newsletters')
                    .where('id', newsletter.id)
                    .update({sender_email_verified_email_id: verifiedEmailId});
            }
        }));

        logging.info(`Backfilled sender_email_verified_email_id for ${newslettersWithSenderEmail.length} newsletter(s)`);

        // 6. Backfill sender_reply_to_verified_email_id on newsletters
        const newslettersWithReplyTo = await knex('newsletters')
            .select('id', 'sender_reply_to')
            .whereNotNull('sender_reply_to')
            .where('sender_reply_to', '!=', '')
            .whereNotIn('sender_reply_to', ['newsletter', 'support']);

        await Promise.all(newslettersWithReplyTo.map(async (newsletter) => {
            const email = newsletter.sender_reply_to.toLowerCase().trim();
            const verifiedEmailId = emailsToInsert.get(email);
            if (verifiedEmailId) {
                await knex('newsletters')
                    .where('id', newsletter.id)
                    .update({sender_reply_to_verified_email_id: verifiedEmailId});
            }
        }));

        logging.info(`Backfilled sender_reply_to_verified_email_id for ${newslettersWithReplyTo.length} newsletter(s)`);
    },

    async function down(knex) {
        // Clear FK columns on newsletters
        await knex('newsletters').update({
            sender_email_verified_email_id: null,
            sender_reply_to_verified_email_id: null
        });

        logging.info('Cleared verified email FK columns on newsletters');

        // Clear all rows from verified_emails
        await knex('verified_emails').del();

        logging.info('Cleared all rows from verified_emails');
    }
);
