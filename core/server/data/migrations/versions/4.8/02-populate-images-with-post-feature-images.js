const chunk = require('lodash/chunk');
const ObjectID = require('bson-objectid');
const logging = require('../../../../../shared/logging');
const {createTransactionalMigration} = require('../../utils');
const moment = require('moment');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Populating images from posts.feature_image');

        const [{id: ownerId} = {id: 1}] = await knex('users')
            .select('users.id')
            .innerJoin(
                'roles_users',
                'users.id',
                'roles_users.user_id'
            )
            .where(
                'roles_users.role_id',
                knex('roles').select('id').where('name', 'Owner')
            );

        const postsWithFeatureImage = await knex.select(
            'id as imageable_id',
            'feature_image as url'
        ).from('posts').whereNotNull('feature_image');

        const allImages = postsWithFeatureImage.map((post) => {
            return {
                ...post,
                id: ObjectID().toHexString(),
                imageable_type: 'feature_image',
                created_at: moment().toDate(),
                created_by: ownerId,
                updated_at: moment().toDate(),
                updated_by: ownerId
            };
        });

        // SQLite3 supports 999 variables max, each row uses 6 variables so ⌊999/6⌋ = 166
        const chunkSize = 166;

        const imageChunks = chunk(allImages, chunkSize);

        for (const images of imageChunks) {
            await knex.insert(images).into('images');
        }
    },

    async function down(knex) {
        logging.info('Clearing images table');
        await knex('images').truncate();
    }
);
