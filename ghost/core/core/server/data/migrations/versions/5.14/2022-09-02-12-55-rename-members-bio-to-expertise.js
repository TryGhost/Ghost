const DatabaseInfo = require('@tryghost/database-info');
const logging = require('@tryghost/logging');
const {createNonTransactionalMigration} = require('../../utils');

module.exports = createNonTransactionalMigration(
    async function up(knex) {
        logging.info('Renaming members.bio to members.expertise');

        const hasBio = await knex.schema.hasColumn('members', 'bio');
        const hasExpertise = await knex.schema.hasColumn('members', 'expertise');

        // If we don't have the `bio` column, or the `expertise` column already exists, we're
        // not in the right state to run this migration
        if (!hasBio || hasExpertise) {
            logging.warn(`Database is in the wrong state - skipping rename (bio=${hasBio}, expertise=${hasExpertise})`);
            return;
        }

        if (DatabaseInfo.isMySQL(knex)) {
            await knex.raw(`ALTER TABLE members CHANGE bio expertise VARCHAR(191) NULL`);
            return;
        }

        await knex.schema.table('members', (table) => {
            table.renameColumn('bio', 'expertise');
        });
    },
    async function down(knex) {
        logging.info('Renaming members.expertise back to members.bio');

        const hasBio = await knex.schema.hasColumn('members', 'bio');
        const hasExpertise = await knex.schema.hasColumn('members', 'expertise');

        // If we already have the `bio` column, or we don't have the `expertise` column, we're
        // not in the right state to run this migration
        if (hasBio || !hasExpertise) {
            logging.warn(`Database is in the wrong state - skipping rename (bio=${hasBio}, expertise=${hasExpertise})`);
            return;
        }

        if (DatabaseInfo.isMySQL(knex)) {
            await knex.raw(`ALTER TABLE members CHANGE expertise bio VARCHAR(191) NULL`);
            return;
        }

        await knex.schema.table('members', (table) => {
            table.renameColumn('expertise', 'bio');
        });
    }
);
