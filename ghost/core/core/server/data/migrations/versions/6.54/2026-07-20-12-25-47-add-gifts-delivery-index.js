const {createNonTransactionalMigration} = require('../../utils');
const {addIndex, dropIndex} = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await addIndex('gifts', ['status', 'deliver_at'], knex);
    },
    async function down(knex) {
        await dropIndex('gifts', ['status', 'deliver_at'], knex);
    }
);
