const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');
const DatabaseInfo = require('@tryghost/database-info');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Populating post_revisions.custom_excerpt with post.excerpt');

        if (DatabaseInfo.isSQLite(knex)) {
            // SQLite doesn't support JOINs in UPDATE queries
            await knex.raw(`
                UPDATE post_revisions
                SET custom_excerpt = (
                    SELECT posts.custom_excerpt
                    FROM posts
                    WHERE post_revisions.post_id = posts.id
                )
            `);
        } else {
            await knex.raw(`
                UPDATE post_revisions
                JOIN posts ON post_revisions.post_id = posts.id
                SET post_revisions.custom_excerpt = posts.custom_excerpt
            `);
        }

        logging.info('Finished populating post_revisions.custom_excerpt');
    },
    async function down() {
        // Not required
    }
);
