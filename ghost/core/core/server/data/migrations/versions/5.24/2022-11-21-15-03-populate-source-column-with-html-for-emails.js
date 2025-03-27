const logging = require('@tryghost/logging');
const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Populating source from html in emails table');

        const affectedRows = await knex('emails')
            .update({
                source: knex.ref('html')
            });

        logging.info(`Updated ${affectedRows} rows with source html data`);
    },

    async function down() {
        // no-op: we don't want to remove the data
    }
);
