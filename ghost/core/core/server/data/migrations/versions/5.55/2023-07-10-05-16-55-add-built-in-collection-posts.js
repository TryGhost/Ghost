const logging = require('@tryghost/logging');
const {default: ObjectID} = require('bson-objectid');
const {createTransactionalMigration} = require('../../utils');

const insertPostCollections = async (knex, collectionId, postIds) => {
    logging.warn(`Batch inserting ${postIds.length} collection posts for collection ${collectionId}`);

    const collectionPosts = postIds.map((postId) => {
        return {
            id: (new ObjectID()).toHexString(),
            collection_id: collectionId,
            post_id: postId,
            sort_order: 0
        };
    });

    await knex.batchInsert('collections_posts', collectionPosts, 1000);
};

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Populating built-in collections');

        const existingLatestCollection = await knex('collections')
            .where({
                slug: 'latest'
            })
            .first();

        if (!existingLatestCollection) {
            logging.warn('Latest collection does not exists, skipping');
        } else {
            const latestPostsRows = await knex('posts')
                .select('id')
                .where({
                    type: 'post'
                });

            const latestPostsIds = latestPostsRows.map(row => row.id);

            await insertPostCollections(knex, existingLatestCollection.id, latestPostsIds);
        }

        const existingFeaturedCollection = await knex('collections')
            .where({
                slug: 'featured'
            })
            .first();

        if (!existingFeaturedCollection) {
            logging.warn('Featured collection does not exist, skipping');
        } else {
            const featuredPostsRows = await knex('posts')
                .select('id')
                .where({
                    featured: true,
                    type: 'post'
                });

            const featuredPostsIds = featuredPostsRows.map(row => row.id);

            await insertPostCollections(knex, existingFeaturedCollection.id, featuredPostsIds);
        }
    },
    async function down(knex) {
        logging.info('Deleting built in collection_posts');

        const existingLatestCollection = await knex('collections')
            .where({
                slug: 'latest'
            })
            .first();

        if (existingLatestCollection) {
            logging.info(`Deleting collection_posts for latest collection: ${existingLatestCollection.id}`);
            await knex('collections_posts')
                .where({
                    collection_id: existingLatestCollection.id
                })
                .del();
        }

        const existingFeaturedCollection = await knex('collections')
            .where({
                slug: 'featured'
            })
            .first();

        if (existingFeaturedCollection) {
            logging.info(`Deleting collection_posts for featured collection: ${existingFeaturedCollection.id}`);

            await knex('collections_posts')
                .where({
                    collection_id: existingFeaturedCollection.id
                })
                .del();
        }
    }
);
