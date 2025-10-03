const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const {readingMinutes} = require('@tryghost/helpers').utils;

module.exports = createTransactionalMigration(
    async function up(knex) {
        const posts = await knex.select('id', 'html', 'feature_image').from('posts').whereNotNull('html');

        logging.info(`Adding reading_time field value to ${posts.length} posts.`);

        // eslint-disable-next-line no-restricted-syntax
        for (const post of posts) {
            const additionalImages = post.feature_image ? 1 : 0;
            const readingTime = readingMinutes(post.html, additionalImages);

            await knex('posts').update('reading_time', readingTime).where('id', post.id);
        }
    },
    async function down() {}
);