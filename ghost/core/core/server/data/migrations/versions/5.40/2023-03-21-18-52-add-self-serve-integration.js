const logging = require('@tryghost/logging');
const {default: ObjectID} = require('bson-objectid');
const {createTransactionalMigration, meta} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Creating "Self-Serve Migration Integration"');
        const existingIntegration = await knex('integrations').where({
            name: 'Self-Serve Migration Integration',
            slug: 'self-serve-migration'
        }).first();

        if (existingIntegration) {
            logging.warn('Integration already exists, skipping');
            return;
        }

        await knex('integrations').insert({
            id: (new ObjectID()).toHexString(),
            type: 'core',
            name: 'Self-Serve Migration Integration',
            description: 'Core Integration for the Self-Serve migration tool',
            slug: 'self-serve-migration',
            created_at: knex.raw('current_timestamp'),
            created_by: meta.MIGRATION_USER
        });
    },
    async function down(knex) {
        logging.info('Deleting "Self-Serve Migration Integration"');

        await knex('integrations').where({
            type: 'core',
            name: 'Self-Serve Migration Integration',
            slug: 'self-serve-migration'
        }).del();
    }
);
