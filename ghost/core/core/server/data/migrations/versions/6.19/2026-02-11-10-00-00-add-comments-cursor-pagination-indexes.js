// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const {createTransactionalMigration} = require('../../utils');
const {addIndex, dropIndex} = require('../../../schema/commands');

module.exports = createTransactionalMigration(
    async function up(knex) {
        // Composite index for top-level comment pagination (filtered by post_id, sorted by created_at/id)
        await addIndex('comments', ['post_id', 'created_at', 'id'], knex);
        // Composite index for reply pagination (filtered by parent_id, sorted by created_at/id)
        await addIndex('comments', ['parent_id', 'created_at', 'id'], knex);
    },
    async function down(knex) {
        await dropIndex('comments', ['post_id', 'created_at', 'id'], knex);
        await dropIndex('comments', ['parent_id', 'created_at', 'id'], knex);
    }
);
