const logging = require('@tryghost/logging');
const {chunk: chunkArray} = require('lodash');
const {createTransactionalMigration} = require('../../utils.js');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Updating members with no products to "free"');

        const freeMembers = await knex('members')
            .select('members.id')
            .leftJoin('members_products', 'members.id', 'members_products.member_id')
            .where('members.status', '!=', 'free')
            .whereNull('members_products.member_id');

        if (freeMembers.length === 0) {
            logging.info('No free members found');
            return;
        }

        // SQLite >= 3.32.0 can support 32766 host parameters
        // We use one for the SET clause, and the rest can be
        // used to populate the WHERE IN (?... clause.
        const chunkSize = 32765;

        const freeMembersIds = freeMembers.map(row => row.id);

        const chunks = chunkArray(freeMembersIds, chunkSize);

        // eslint-disable-next-line no-restricted-syntax
        for (const chunk of chunks) {
            await knex('members')
                .update('status', 'free')
                .whereIn('id', chunk);
        }
    },
    async function down() {
        logging.warn('Not reverting members to incorrect status');
    }
);
