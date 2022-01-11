const {createTransactionalMigration} = require('../../utils');
const ObjectID = require('bson-objectid');
const {slugify} = require('@tryghost/string');
const logging = require('@tryghost/logging');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const [result] = await knex
            .count('id', {as: 'total'})
            .from('products')
            .where('type', 'free');

        if (result.total !== 0) {
            logging.warn(`Not adding default free tier, a free tier already exists`);
            return;
        }

        const name = 'Free';
        const id = ObjectID().toHexString();

        logging.info(`Adding tier "${name}"`);
        await knex('products')
            .insert({
                id: id,
                name: name,
                type: 'free',
                slug: slugify(id),
                created_at: knex.raw(`CURRENT_TIMESTAMP`)
            });
    },
    async function down(knex) {
        logging.info('Removing free tier');
        await knex('products')
            .where('type', 'free')
            .del();
    }
);
