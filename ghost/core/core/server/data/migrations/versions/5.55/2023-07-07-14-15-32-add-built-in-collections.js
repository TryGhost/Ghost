const logging = require('@tryghost/logging');
const {default: ObjectID} = require('bson-objectid');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Creating built in collections');

        const existingIndexCollection = await knex('collections')
            .where({
                slug: 'index'
            })
            .first();

        if (existingIndexCollection) {
            logging.warn('Index collection already exists, skipping');
        } else {
            await knex('collections').insert({
                id: (new ObjectID()).toHexString(),
                name: 'Index',
                slug: 'index',
                description: 'Collection with all posts',
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
            logging.warn('Index collection already exists, skipping');
        } else {
            await knex('collections').insert({
                id: (new ObjectID()).toHexString(),
                name: 'Featured',
                slug: 'featured',
                description: 'Collection of featured posts',
                type: 'automatic',
                filter: 'featured:true',
                created_at: knex.raw('current_timestamp')
            });
        }
    },
    async function down(knex) {
        logging.info('Deleting built in collections');

        await knex('collections').where({
            slug: 'index'
        }).del();

        await knex('collections').where({
            slug: 'featured'
        }).del();
    }
);
