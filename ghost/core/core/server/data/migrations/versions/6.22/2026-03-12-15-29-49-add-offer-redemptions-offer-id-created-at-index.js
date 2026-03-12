const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addIndex, dropIndex} = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await addIndex('offer_redemptions', ['offer_id', 'created_at'], knex);
    },
    async function down(knex) {
        try {
            await dropIndex('offer_redemptions', ['offer_id', 'created_at'], knex);
        } catch (err) {
            if (err.code === 'ER_DROP_INDEX_FK') {
                logging.error({
                    message: 'Error dropping index over offer_redemptions(offer_id, created_at), re-adding index for offer_id'
                });

                await addIndex('offer_redemptions', ['offer_id'], knex);
                await dropIndex('offer_redemptions', ['offer_id', 'created_at'], knex);
                return;
            }

            throw err;
        }
    }
);
