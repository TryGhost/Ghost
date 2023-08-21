const logging = require('@tryghost/logging');
const DatabaseInfo = require('@tryghost/database-info');
const {createNonTransactionalMigration} = require('../../utils');

const INDEX_NAME = 'posts_published_at_index';

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        let hasIndex = false;

        if (DatabaseInfo.isSQLite(knex)) {
            const result = await knex.raw(`select * from sqlite_master where type = 'index' and tbl_name = 'posts' and name = '${INDEX_NAME}'`);
            hasIndex = (result.length !== 0);
        } else {
            const result = await knex.raw(`show index from posts where Key_name = '${INDEX_NAME}'`);
            hasIndex = (result[0].length !== 0);
        }

        if (hasIndex) {
            logging.info(`Skipping creation of index ${INDEX_NAME} on posts for published_at - already exists`);
            return;
        }

        logging.info(`Creating index ${INDEX_NAME} on posts for published_at`);
        await knex.schema.table('posts', (table) => {
            table.index(['published_at']);
        });
    },

    async function down(knex) {
        let missingIndex = false;

        if (DatabaseInfo.isSQLite(knex)) {
            const result = await knex.raw(`select * from sqlite_master where type = 'index' and tbl_name = 'posts' and name = '${INDEX_NAME}'`);
            missingIndex = (result.length === 0);
        } else {
            const result = await knex.raw(`show index from posts where Key_name = '${INDEX_NAME}'`);
            missingIndex = (result[0].length === 0);
        }

        if (missingIndex) {
            logging.info(`Skipping drop of index ${INDEX_NAME} on posts for published_at - does not exist`);
            return;
        }

        logging.info(`Dropping index ${INDEX_NAME} on posts for published_at`);
        await knex.schema.table('posts', (table) => {
            table.dropIndex(['published_at']);
        });
    }
);
