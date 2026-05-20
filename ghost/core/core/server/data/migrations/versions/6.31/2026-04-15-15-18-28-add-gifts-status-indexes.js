const {createNonTransactionalMigration} = require('../../utils');
const {addIndex, dropIndex} = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await addIndex('gifts', ['status', 'consumes_at'], knex);
        await addIndex('gifts', ['status', 'expires_at'], knex);
    },
    async function down(knex) {
        await dropIndex('gifts', ['status', 'consumes_at'], knex);
        await dropIndex('gifts', ['status', 'expires_at'], knex);
    }
);
