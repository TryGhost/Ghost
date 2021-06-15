const {createTransactionalMigration} = require('../../utils');
const ObjectID = require('bson-objectid');
const {chunk} = require('lodash');
const logging = require('@tryghost/logging');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const membersWithProduct = await knex
            .select('id')
            .from('members')
            .whereIn('status', ['comped', 'paid']);

        if (membersWithProduct.length === 0) {
            logging.info(`No members found with product`);
            return;
        }

        const product = await knex
            .select('id', 'name')
            .from('products')
            .first();

        if (!product) {
            logging.warn(`No product found to attach members to`);
            return;
        }

        logging.info(`Attaching product ${product.name} to ${membersWithProduct.length} members`);
        const memberProductRelations = membersWithProduct.map((member) => {
            return {
                id: ObjectID().toHexString(),
                member_id: member.id,
                product_id: product.id
            };
        });

        // SQLite max variables is 999, we have 3 per insert (id, member_id, product_id) so most inserts in a query is 999/3 = 333
        const chunkSize = 333;
        const memberProductRelationsChunks = chunk(memberProductRelations, chunkSize);

        for (const relations of memberProductRelationsChunks) {
            await knex.insert(relations).into('members_products');
        }
    },
    async function down(knex) {
        logging.info('Removing all members_products relations');
        await knex('members_products').del();
    }
);
