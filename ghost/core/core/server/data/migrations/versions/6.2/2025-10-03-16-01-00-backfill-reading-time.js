const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const {calculatePostReadingTime} = require('../../../../../shared/post-reading-time');

module.exports = createTransactionalMigration(
    async function up(knex) {
        const posts = await knex.select('id', 'html', 'feature_image').from('posts').whereNotNull('html');

        logging.info(`Adding reading_time field value to ${posts.length} posts.`);

        // eslint-disable-next-line no-restricted-syntax
        for (const post of posts) {
            const readingTime = calculatePostReadingTime(post.html, post.feature_image);
            await knex('posts').update('reading_time', readingTime).where('id', post.id);
        }
    },
    async function down() {}
);
