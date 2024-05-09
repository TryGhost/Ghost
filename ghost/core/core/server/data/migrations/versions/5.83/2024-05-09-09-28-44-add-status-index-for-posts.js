// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const {createNonTransactionalMigration} = require('../../utils');
const {addIndex, dropIndex} = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await addIndex('posts', ['status', 'type'], knex);
    },
    async function down(knex) {
        await dropIndex('posts', ['status', 'type'], knex);
    }
);
