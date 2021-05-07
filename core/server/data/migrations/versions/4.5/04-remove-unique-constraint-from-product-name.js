const {createNonTransactionalMigration} = require('../../utils');
const {dropUnique} = require('../../../schema/commands');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        return await dropUnique('products', 'name', knex);
    },
    async function down() {
        // We cannot roll back this migration because adding a unique constraint
        // could error if we have duplicate names already in the table.
        return;
    }
);
