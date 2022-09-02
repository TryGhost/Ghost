const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        await knex.schema.table('members', (table) => {
            table.renameColumn('bio', 'expertise');
        });
    },
    async function down(knex) {
        // probably shouldn't be reversible though as its a breaking change?
        await knex.schema.table('members', (table) => {
            table.renameColumn('expertise', 'bio');
        });
    }
)
