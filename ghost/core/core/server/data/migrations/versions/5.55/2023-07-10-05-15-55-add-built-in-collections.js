const logging = require('@tryghost/logging');
const {default: ObjectID} = require('bson-objectid');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Creating built in collections');

        const existingLatestCollection = await knex('collections')
            .where({
                slug: 'latest'
            })
            .first();

        if (existingLatestCollection) {
            logging.warn('Latest collection already exists, skipping');
        } else {
            await knex('collections').insert({
                id: (new ObjectID()).toHexString(),
                title: 'Latest',
                slug: 'latest',
                description: 'All posts',
                type: 'automatic',
                filter: '',
                created_at: knex.raw('current_timestamp')
            });
        }

        const existingFeaturedCollection = await knex('collections')
            .where({
                slug: 'featured'
            })
            .first();

        if (existingFeaturedCollection) {
            logging.warn('Featured collection already exists, skipping');
        } else {
            await knex('collections').insert({
                id: (new ObjectID()).toHexString(),
                title: 'Featured',
                slug: 'featured',
                description: 'Featured posts',
                type: 'automatic',
                filter: 'featured:true',
                created_at: knex.raw('current_timestamp')
            });
        }
    },
    async function down(knex) {
        logging.info('Deleting built in collections');

        await knex('collections').where({
            slug: 'latest'
        }).del();

        await knex('collections').where({
            slug: 'featured'
        }).del();
    }
);
