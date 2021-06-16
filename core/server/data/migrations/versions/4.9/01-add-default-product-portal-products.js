const {createTransactionalMigration} = require('../../utils');
const logging = require('../../../../../shared/logging');

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

        const portalProductSetting = await knex('settings')
            .where('key', 'portal_products')
            .select('value')
            .first();

        if (!portalProductSetting) {
            logging.info('Skipping adding default product to portal_products, setting does not exist');
            return;
        }

        if (portalProductSetting.length > 0) {
            logging.info('Skipping adding default product to portal_products, already contains products');
            return;
        }
        logging.info(`Adding default product - ${defaultProduct.id} - to portal_products setting`);

        let currentProducts = [defaultProduct.id];

        await knex('settings')
            .where('key', 'portal_products')
            .update({value: JSON.stringify(currentProducts)});
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
