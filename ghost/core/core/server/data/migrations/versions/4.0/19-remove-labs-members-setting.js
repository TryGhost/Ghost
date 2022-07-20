const logging = require('@tryghost/logging');
const {createIrreversibleMigration} = require('../../utils');

module.exports = createIrreversibleMigration(async (knex) => {
    logging.info('Deleting labs from settings table');

    await knex('settings')
        .where('key', '=', 'labs')
        .del();
});
