const logging = require('@tryghost/logging');
const {default: ObjectID} = require('bson-objectid');
const {createTransactionalMigration, meta} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Creating Ghost Explore Integration');
        const existingIntegration = await knex('integrations').where({
            name: 'Ghost Explore',
            slug: 'ghost-explore'
        }).first();

        if (existingIntegration) {
            logging.warn('Integration already exists, skipping');
            return;
        }

        await knex('integrations').insert({
            id: (new ObjectID()).toHexString(),
            type: 'internal',
            name: 'Ghost Explore',
            description: 'Internal Integration for the Ghost Explore directory',
            slug: 'ghost-explore',
            created_at: knex.raw('current_timestamp'),
            created_by: meta.MIGRATION_USER
        });
    },
    async function down(knex) {
        logging.info('Deleting Ghost Explore Integration');

        await knex('integrations').where({
            type: 'internal',
            name: 'Ghost Explore',
            slug: 'ghost-explore'
        }).del();
    }
);
