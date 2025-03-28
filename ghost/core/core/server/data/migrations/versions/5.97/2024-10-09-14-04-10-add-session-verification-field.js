const logging = require('@tryghost/logging');

const {createTransactionalMigration} = require('../../utils');

module.exports = createTransactionalMigration(
    async function up(knex) {
        logging.info('Adding verified property to sessions');

        await knex.raw(`
            UPDATE sessions
            SET session_data = JSON_SET(session_data, '$.verified', 'true')
            WHERE JSON_VALID(session_data);
        `);
    },

    async function down(knex) {
        logging.info('Removing verified property from sessions');

        await knex.raw(`
            UPDATE sessions
            SET session_data = JSON_REMOVE(session_data, '$.verified')
            WHERE JSON_VALID(session_data);
        `);
    }
);
