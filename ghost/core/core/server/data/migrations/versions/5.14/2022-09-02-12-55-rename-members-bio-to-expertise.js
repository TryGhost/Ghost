const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration (
    async function up(knex) {
        // check if the column exists before trying to rename it
        const hasBio = await knex.schema.hasColumn('members', 'bio');
        const hasExpertise = await knex.schema.hasColumn('members', 'expertise');

        if (hasBio && !hasExpertise) {
            logging.info('Renaming members.bio to members.expertise');
            await knex.schema.table('members', (table) => {
                table.renameColumn('bio', 'expertise');
            }
            );
        } else {
            logging.info('members.bio does not exist, skipping rename');
        }
    },
    async function down(knex) {
        const hasBio = await knex.schema.hasColumn('members', 'bio');
        const hasExpertise = await knex.schema.hasColumn('members', 'expertise');

        if (hasExpertise && !hasBio) {
            logging.info(`Renaming members.expertise to members.bio`);
            await knex.schema.table('members', (table) => {
                table.renameColumn('expertise', 'bio');
            }
            );
        } else {
            logging.warn('members.expertise does not exist, skipping');
        }
    }
);
