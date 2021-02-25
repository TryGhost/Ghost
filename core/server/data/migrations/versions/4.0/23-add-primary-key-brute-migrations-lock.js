const logging = require('../../../../../shared/logging');
const {createIrreversibleMigration} = require('../../utils');
const {addPrimaryKey} = require('../../../schema/commands');

module.exports = createIrreversibleMigration(async (knex) => {
    logging.info('Adding a primary key for the brute table');

    await addPrimaryKey('brute', 'key', knex);
});
