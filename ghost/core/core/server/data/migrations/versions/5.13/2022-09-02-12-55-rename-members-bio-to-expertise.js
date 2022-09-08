const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        // check if the column exists before trying to rename it
        const hasColumn = await knex.schema.hasColumn('members', 'bio');
        if (hasColumn) {
            logging.info('Renaming members.bio to members.expertise');
            await knex.schema.table('members', (table) => {
                table.renameColumn('bio', 'expertise');
            }
            );
        }
    },
    async function down(knex) {
        const hasColumn = await knex.schema.hasColumn('members', 'expertise');
        if (hasColumn) {
            logging.info(`Renaming members.expertise to members.bio`);
            await knex.schema.table('members', (table) => {
                table.renameColumn('expertise', 'bio');
            }
            );
        }
    }
);
