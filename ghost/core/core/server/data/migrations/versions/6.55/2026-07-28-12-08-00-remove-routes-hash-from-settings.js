const {combineTransactionalMigrations, removeSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    removeSetting('routes_hash')
);
