const {createNonTransactionalMigration} = require('../../utils');
const commands = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await commands.addIndex('gifts', ['status', 'consumes_at'], knex);
        await commands.addIndex('gifts', ['status', 'expires_at'], knex);
    },
    async function down(knex) {
        await commands.dropIndex('gifts', ['status', 'consumes_at'], knex);
        await commands.dropIndex('gifts', ['status', 'expires_at'], knex);
    }
);
