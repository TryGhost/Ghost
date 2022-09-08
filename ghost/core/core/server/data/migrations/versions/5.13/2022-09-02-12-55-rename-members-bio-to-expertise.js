const {createRenameColumnMigration} = require('../../utils');

module.exports = createRenameColumnMigration('members', 'bio', 'expertise');
