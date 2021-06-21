const ObjectID = require('bson-objectid');
const {createTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');

const MIGRATION_USER = 1;

module.exports = createTransactionalMigration(
    async function up(knex) {
        const products = await knex
            .select('id')
            .from('products');

        if (products.length === 0) {
            logging.warn(`Skipping adding default product to portal_products, no default product exists`);
            return;
        }

        const defaultProduct = products[0];
        const portalProductsValue = [defaultProduct.id];

        const portalProductsSetting = await knex('settings')
            .where('key', 'portal_products')
            .select('value')
            .first();

        if (!portalProductsSetting) {
            logging.info(`Adding "portal_products" record to "settings" table with product - ${defaultProduct.id}`);

            const now = knex.raw('CURRENT_TIMESTAMP');

            await knex('settings')
                .insert({
                    id: ObjectID().toHexString(),
                    key: 'portal_products',
                    value: JSON.stringify(portalProductsValue),
                    group: 'portal',
                    type: 'array',
                    created_at: now,
                    created_by: MIGRATION_USER,
                    updated_at: now,
                    updated_by: MIGRATION_USER
                });
            return;
        }

        logging.info(`Setting portal_products setting to have product - ${defaultProduct.id}`);

        await knex('settings')
            .where('key', 'portal_products')
            .update({value: JSON.stringify(portalProductsValue)});
    },
    async function down(knex) {
        const portalProductSetting = await knex('settings')
            .where('key', 'portal_products')
            .select('value')
            .first();

        if (!portalProductSetting) {
            logging.info('Skipping revert of portal_products setting, setting does not exist');
            return;
        }

        logging.info(`Reverting portal_products setting to empty array`);

        await knex('settings')
            .where('key', 'portal_products')
            .update({value: JSON.stringify([])});
    }
);
