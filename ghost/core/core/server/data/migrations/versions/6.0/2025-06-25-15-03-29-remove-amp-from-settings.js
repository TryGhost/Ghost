const {combineTransactionalMigrations, removeSetting} = require('../../utils');

module.exports = combineTransactionalMigrations(
    removeSetting('amp'),
    removeSetting('amp_gtag_id')
);