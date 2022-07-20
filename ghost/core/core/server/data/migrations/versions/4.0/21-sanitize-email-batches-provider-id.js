const logging = require('@tryghost/logging');
const {createIrreversibleMigration} = require('../../utils');

module.exports = createIrreversibleMigration(async (knex) => {
    logging.info('Sanitizing provider_id values in email_batches');

    await knex.raw('UPDATE email_batches SET provider_id = REPLACE(REPLACE(provider_id, "<", ""), ">", "")');
});
