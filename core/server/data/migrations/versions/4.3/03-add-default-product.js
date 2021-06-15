const {createTransactionalMigration} = require('../../utils');
const ObjectID = require('bson-objectid');
const {slugify} = require('@tryghost/string');
const logging = require('@tryghost/logging');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const [result] = await knex
            .count('id', {as: 'total'})
            .from('products');

        if (result.total !== 0) {
            logging.warn(`Not adding default product, a product already exists`);
            return;
        }

        const productNameSetting = await knex
            .select('value')
            .from('settings')
            .where('key', 'stripe_product_name')
            .first();

        const nameSettingHasValue = !!(productNameSetting && productNameSetting.value);
        const name = nameSettingHasValue ? productNameSetting.value : 'Ghost Subscription';

        logging.info(`Adding product "${name}"`);
        await knex('products')
            .insert({
                id: ObjectID().toHexString(),
                name: name,
                slug: slugify(name),
                created_at: knex.raw(`CURRENT_TIMESTAMP`)
            });
    },
    async function down(knex) {
        logging.info('Removing all products');
        await knex('products').del();
    }
);
