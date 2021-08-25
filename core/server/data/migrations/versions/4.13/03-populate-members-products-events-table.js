const {chunk} = require('lodash');
const {createTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');
const ObjectId = require('bson-objectid').default;

module.exports = createTransactionalMigration(
    async function up(connection) {
        const memberProductRelationships = await connection('members_products').select('*');

        if (memberProductRelationships.length === 0) {
            logging.warn('Skipping population of members_product_events rows - no members_products relationships found.');
            return;
        }
        logging.info(`Adding ${memberProductRelationships.length} members_product_events rows for existing members_products relationships`);

        const memberProductEvents = memberProductRelationships.map((row) => {
            return {
                id: new ObjectId().toHexString(),
                created_at: connection.raw('CURRENT_TIMESTAMP'),
                member_id: row.member_id,
                product_id: row.product_id,
                action: 'added'
            };
        });

        const CHUNK_SIZE = Math.floor(999 / 5);
        const memberProductEventChunks = chunk(memberProductEvents, CHUNK_SIZE);

        for (const memberProductEventChunk of memberProductEventChunks) {
            await connection('members_product_events')
                .insert(memberProductEventChunk);
        }
    },
    async function down(connection) {
        logging.info('Deleting all rows from members_product_events');
        await connection('members_product_events').del();
    }
);
