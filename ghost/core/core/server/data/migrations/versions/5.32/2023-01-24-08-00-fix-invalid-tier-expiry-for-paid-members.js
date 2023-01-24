const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Removing expiry dates for paid members');
        try {
            const memberIdsWithInvalidExpiry = await knex('members_products')
                .select('members_products.member_id as id')
                .leftJoin('members', 'members_products.member_id', 'members.id')
                .where('members.status', '=', 'paid')
                .whereNotNull('members_products.expiry_at').pluck('id');

            logging.info(`Found ${memberIdsWithInvalidExpiry.length} paid members with expiry dates`);

            if (memberIdsWithInvalidExpiry.length === 0) {
                return;
            }

            logging.info(`Removing expiry dates for ${memberIdsWithInvalidExpiry.length} paid members`);

            await knex('members_products')
                .update('expiry_at', null)
                .whereIn('member_id', memberIdsWithInvalidExpiry);
        } catch (err) {
            logging.warn('Failed to remove expiry dates for paid members');
            logging.warn(err);
        }
    },
    async function down() {
        // no-op: we don't want to reintroduce the incorrect expiry dates for member tiers
    }
);
