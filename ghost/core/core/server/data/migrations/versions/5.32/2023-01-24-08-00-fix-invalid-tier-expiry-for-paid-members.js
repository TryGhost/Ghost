const logging = require('@tryghost/logging');
const {chunk: chunkArray} = require('lodash');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Removing expiry dates for paid members');

        const paidMembersWithExpiry = await knex('members_products')
            .select('members_products.id')
            .leftJoin('members', 'members_products.member_id', 'members.id')
            .where('members.status', '=', 'paid')
            .whereNotNull('members_products.expiry_at');

        logging.info(`Found ${paidMembersWithExpiry.length} paid members with expiry dates`);

        if (paidMembersWithExpiry.length === 0) {
            return;
        }

        logging.info(`Removing expiry dates for ${paidMembersWithExpiry.length} paid members`);

        // SQLite >= 3.32.0 can support 32766 host parameters
        // We use one for the SET clause, and the rest can be
        // used to populate the WHERE IN (?... clause.
        const chunkSize = 32765;

        const paidMembersWithExpiryIds = paidMembersWithExpiry.map(row => row.id);

        const chunks = chunkArray(paidMembersWithExpiryIds, chunkSize);

        // eslint-disable-next-line no-restricted-syntax
        for (const chunk of chunks) {
            await knex('members_products')
                .update('expiry_at', null)
                .whereIn('id', chunk);
        }
    },
    async function down() {
        // no-op: we don't want to reintroduce the incorrect expiry dates for member tiers
    }
);
