const {createRenameColumnMigration} = require('../../utils');

module.exports = createRenameColumnMigration('recommendations', 'reason', 'description');
