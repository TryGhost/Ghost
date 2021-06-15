const logging = require('@tryghost/logging');
const {createIrreversibleMigration} = require('../../utils');
const {addForeign} = require('../../../schema/commands');

module.exports = createIrreversibleMigration(async (knex) => {
    logging.info('Adding the webhooks to integrations foreign key');

    await addForeign({
        fromTable: 'webhooks',
        fromColumn: 'integration_id',
        toTable: 'integrations',
        toColumn: 'id',
        cascadeDelete: true,
        transaction: knex
    });
});
