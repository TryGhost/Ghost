const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const find = require('lodash/find');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Migrating sender settings to default newsletter');

        // Get all settings in one query
        const settings = await knex('settings')
            .whereIn('key', [
                'members_from_address',
                'members_reply_address'
            ])
            .select(['key', 'value']);

        // sender_reply_to and members_reply_address are both enums ['newsletter', 'support']
        const replyTo = find(settings, {key: 'members_reply_address'});
        const fromAddress = find(settings, {key: 'members_from_address'});

        // Update all newsletters that haven't been (re)configured already
        await knex('newsletters')
            .update({
                // CASE: members_from_address is 'noreply' - we leave it as null to maintain fallback behaviour
                sender_email: !fromAddress || fromAddress.value === 'noreply' ? null : fromAddress.value,
                sender_reply_to: replyTo ? replyTo.value : undefined
            })
            .whereNull('sender_email')
            .where('sender_reply_to', 'newsletter');
    },
    async function down() {
        // no-op
    }
);
