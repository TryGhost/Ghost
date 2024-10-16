const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Removing expiry dates for paid members');
        try {
            // Fetch all members with a paid status that have an expiry date
            // Paid members should not have an expiry date
            const invalidExpiryIds = await knex('members_products')
                .select('members_products.id')
                .leftJoin('members', 'members_products.member_id', 'members.id')
                .where('members.status', '=', 'paid')
                .whereNotNull('members_products.expiry_at').pluck('members_products.id');

            logging.info(`Found ${invalidExpiryIds.length} paid members with expiry dates`);

            if (invalidExpiryIds.length === 0) {
                return;
            }

            logging.info(`Removing expiry dates for ${invalidExpiryIds.length} paid members`);

            await knex('members_products')
                .update('expiry_at', null)
                .whereIn('id', invalidExpiryIds);
        } catch (err) {
            logging.warn('Failed to remove expiry dates for paid members');
            logging.warn(err);
        }
    },
    async function down() {
        // no-op: we don't want to reintroduce the incorrect expiry dates for member tiers
    }
);
