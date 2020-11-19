const {addTable, combineNonTransactionalMigrations} = require('../../utils');

module.exports = combineNonTransactionalMigrations(
    addTable('integrations'),
    addTable('api_keys')
);
