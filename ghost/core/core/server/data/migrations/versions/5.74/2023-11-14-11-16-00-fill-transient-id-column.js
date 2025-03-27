const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Setting transient_id column to email');

        const updatedRows = await knex('members')
            .update('transient_id', knex.raw('email'));

        logging.info(`Updated ${updatedRows} members with transient_id = email`);
    },
    async function down() {
        // Not required
    }
);
