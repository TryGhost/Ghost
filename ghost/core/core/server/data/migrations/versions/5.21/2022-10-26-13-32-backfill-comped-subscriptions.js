const logging = require('@tryghost/logging');
const ObjectId = require('bson-objectid').default;

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const compedMembers = await knex('members')
            .select([
                'members.id',
                'members_products.product_id',
                'members_products.expiry_at'
            ])
            .leftJoin('members_products', 'members.id', 'members_products.member_id')
            .where('members.status', 'comped');

        if (!compedMembers.length) {
            logging.info(`No comped members found - skipping subscription backfill`);
            return;
        }

        const now = knex.raw('CURRENT_TIMESTAMP');

        const rowsToInsert = compedMembers.map(m => ({
            id: ObjectId().toHexString(),
            type: 'comped',
            member_id: m.id,
            created_at: now,
            status: 'active',
            tier_id: m.product_id,
            expires_at: m.expiry_at
        }));

        logging.info(`Inserting ${rowsToInsert.length} backfilled comped subscriptions`);
        await knex.batchInsert('subscriptions', rowsToInsert);
    },
    async function down(knex) {
        await knex('subscriptions')
            .where('type', 'comped')
            .del();
    }
);
