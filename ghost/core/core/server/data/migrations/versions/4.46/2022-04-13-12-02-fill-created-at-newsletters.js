const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Setting missing created_at values for existing newsletters');

        const now = knex.raw('CURRENT_TIMESTAMP');
        const updatedRows = await knex('newsletters')
            .where('created_at', null)
            .update('created_at', now);

        logging.info(`Updated ${updatedRows} newsletters with created_at = now`);
    },
    async function down() {
        // Not required: we would lose information here.
    }
);
