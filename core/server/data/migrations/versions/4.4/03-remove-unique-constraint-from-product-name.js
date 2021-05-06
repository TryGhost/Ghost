const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        return knex.schema.table('products', (table) => {
            table.dropUnique('name');
        });
    },
    async function down() {
        // We cannot roll back this migration because adding a unique constraint
        // could error if we have duplicate names already in the table.
        return;
    }
);
