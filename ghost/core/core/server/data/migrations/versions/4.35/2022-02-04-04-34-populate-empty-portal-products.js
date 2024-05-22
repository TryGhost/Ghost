const {createTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const products = await knex
            .select('id')
            .where({
                type: 'paid'
            })
            .from('products');

        if (products.length === 0) {
            logging.warn(`Skipping updating portal_products, no product exists`);
            return;
        }

        if (products.length > 1) {
            logging.warn(`Skipping updating portal_products, tiers beta is enabled`);
            return;
        }

        const portalProductsSetting = await knex('settings')
            .where('key', 'portal_products')
            .select('value')
            .first();

        if (!portalProductsSetting) {
            logging.warn(`Missing portal_products setting`);
            return;
        }
        try {
            const currPortalProductsValue = JSON.parse(portalProductsSetting.value);

            if (currPortalProductsValue.length > 0) {
                logging.warn(`Ignoring - portal_products setting is not empty, - ${currPortalProductsValue}`);
                return;
            }

            const defaultProduct = products[0];
            const portalProductsValue = [defaultProduct.id];

            logging.info(`Setting portal_products setting to have product - ${defaultProduct.id}`);

            const now = knex.raw('CURRENT_TIMESTAMP');

            await knex('settings')
                .where('key', 'portal_products')
                .update({
                    value: JSON.stringify(portalProductsValue),
                    updated_at: now
                });
        } catch (e) {
            logging.warn(`Ignoring, unable to parse portal_products setting value - ${portalProductsSetting.value}`);
            logging.warn(e);
        }
    },
    // no-op - we don't want to return to invalid state
    async function down() {}
);
