const logging = require('../../../../../shared/logging');
const {createIrreversibleMigration} = require('../../utils');

module.exports = createIrreversibleMigration(async (knex) => {
    /* eslint-disable */
    /* jshint ignore:start */
    logging.info('Sanitizing provider_id values in email_batches');

    await knex.raw("UPDATE email_batches SET provider_id = REPLACE(REPLACE(provider_id, '<', ''), '>', '');");
    /* jshint ignore:end */
});
