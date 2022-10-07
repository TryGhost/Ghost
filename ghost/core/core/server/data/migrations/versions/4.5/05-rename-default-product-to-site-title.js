const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(connection) {
        const defaultProduct = await connection('products')
            .where({name: 'Default Product'})
            .select('id')
            .first();

        const siteTitleSetting = await connection('settings')
            .where('key', 'title')
            .select('value')
            .first();

        if (!defaultProduct) {
            logging.warn('Skipping rename of default product to site title, default product doesn\'t exist or already renamed');
            return;
        }

        if (!siteTitleSetting || !siteTitleSetting.value) {
            logging.warn('Skipping rename of default product to site title, no site title found');
            return;
        }
        logging.info(`Renaming default product name to ${siteTitleSetting.value}`);
        await connection('products')
            .update({
                name: siteTitleSetting.value
            })
            .where({
                id: defaultProduct.id
            });
    },

    async function down() {
        // noop: We don't want to rename existing product back to 'Default Product'
    }
);
