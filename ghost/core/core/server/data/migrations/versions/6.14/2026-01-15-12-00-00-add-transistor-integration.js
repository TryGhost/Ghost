const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const ObjectID = require('bson-objectid').default;

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Adding Transistor integration');
        const existing = await knex
            .select('id')
            .from('integrations')
            .where('slug', '=', 'transistor')
            .first();

        if (existing) {
            logging.warn('Found existing Transistor integration');
            return;
        }

        await knex
            .insert({
                id: (new ObjectID()).toHexString(),
                type: 'builtin',
                slug: 'transistor',
                name: 'Transistor',
                description: 'Built-in Transistor integration',
                created_at: knex.raw('current_timestamp')
            })
            .into('integrations');
    },
    async function down(knex) {
        logging.info('Removing Transistor integration');
        await knex
            .del()
            .from('integrations')
            .where('slug', '=', 'transistor')
            .andWhere('type', '=', 'builtin');
    }
);
