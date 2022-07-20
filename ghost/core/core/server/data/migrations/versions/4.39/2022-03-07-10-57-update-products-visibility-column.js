const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const portalProductSetting = await knex('settings').select('value').where('key', 'portal_products').first();

        if (!portalProductSetting) {
            logging.warn('Could not find portal_products setting - skipping migration');
            return;
        }

        try {
            const settingData = JSON.parse(portalProductSetting.value);

            if (settingData.length === 0) {
                logging.warn(`portal_product is empty, skipping migrations`);
                return;
            }

            logging.info(`Updating ${settingData.length} products to visible, ${settingData}`);
            await knex('products').update('visibility', 'public').whereIn('id', settingData);
        } catch (err) {
            logging.warn('portal_products setting is invalid - skipping migration');
            return;
        }
    },
    async function down(knex) {
        const visibleTiers = await knex('products').select('id').where('visibility', 'public');

        const settingData = JSON.stringify(visibleTiers.map(obj => obj.id));

        logging.info(`Updating portal_products to ${settingData}`);
        await knex('settings').update('value', settingData).where('key', 'portal_products');
    }
);
