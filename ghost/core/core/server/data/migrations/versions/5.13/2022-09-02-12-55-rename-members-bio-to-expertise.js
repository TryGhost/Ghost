const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info(`Changing column bio to expertise in members table`);
        await knex.schema.table('members', (table) => {
            table.renameColumn('bio', 'expertise');
        });
    },
    async function down(knex) {
        await knex.schema.table('members', (table) => {
            logging.info(`Changing column expertise to bio in members table`);
            table.renameColumn('expertise', 'bio');
        });
    }
);
