const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');
const {addIndex, dropIndex} = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await addIndex('posts_tags', ['post_id', 'tag_id'], knex);
    },
    async function down(knex) {
        try {
            await dropIndex('posts_tags', ['post_id', 'tag_id'], knex);
        } catch (err) {
            if (err.code === 'ER_DROP_INDEX_FK') {
                logging.error({
                    message: 'Error dropping index over posts_tags(post_id, tag_id), re-adding index for post_id'
                });

                await addIndex('posts_tags', ['post_id'], knex);
                await dropIndex('posts_tags', ['post_id', 'tag_id'], knex);
                return;
            }

            throw err;
        }
    }
);