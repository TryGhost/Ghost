const {createTransactionalMigration} = require('../../utils');
const logging = require('@tryghost/logging');

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

        const portalProductsSetting = await knex('settings')
            .where('key', 'portal_products')
            .select('value')
            .first();

        const portalProducts = JSON.parse(portalProductsSetting.value);

        logging.info(`Adding default product - ${defaultProduct.id} - to portal_products setting`);

        portalProducts.push(defaultProduct.id);

        await knex('settings')
            .where('key', 'portal_products')
            .update({value: JSON.stringify(portalProducts)});
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
