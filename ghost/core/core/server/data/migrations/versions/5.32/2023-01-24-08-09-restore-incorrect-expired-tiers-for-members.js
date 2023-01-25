const logging = require('@tryghost/logging');
const ObjectId = require('bson-objectid').default;
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Restoring member<>tier mapping for members with paid status');
        try {
            // fetch all members with a paid status that don't have a members_products record
            // and have a members_product_events record with an action of "added"
            // and fetch the product_id from the most recent record for that member
            const memberWithTiers = await knex.select('m.id as member_id', 'mpe.product_id as product_id')
                .from('members as m')
                .leftJoin('members_products as mp', 'm.id', 'mp.member_id')
                .leftJoin('members_product_events as mpe', function () {
                    this.on('m.id', 'mpe.member_id')
                        .andOn(knex.raw('mpe.created_at = (SELECT max(created_at) FROM members_product_events WHERE member_id = mpe.member_id and action = "added")'));
                })
                .where({'m.status': 'paid', 'mp.member_id': null, 'mpe.action': 'added'});

            // create a new members_products record for each member with id, member_id and product_id
            const toInsert = memberWithTiers.map((memberTier) => {
                return {
                    ...memberTier,
                    id: ObjectId().toHexString()
                };
            }).filter((memberTier) => {
                // filter out any members that don't have a product_id for some reason
                if (!memberTier.product_id) {
                    logging.warn(`Invalid record found - member_id: ${memberTier.member_id} is without product_id`);
                    return false;
                }
                return true;
            });

            logging.info(`Inserting ${toInsert.length} records into members_products`);
            await knex.batchInsert('members_products', toInsert);
        } catch (err) {
            logging.warn('Failed to restore member<>tier mapping for members with paid status');
            logging.warn(err);
        }
    },
    async function down() {
        // np-op: we don't want to delete the missing records we've just inserted
    }
);
