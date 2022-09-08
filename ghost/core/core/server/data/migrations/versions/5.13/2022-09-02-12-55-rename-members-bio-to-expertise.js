const {createRenameColumnMigration} = require('../../utils');

// args (table, oldColumn, newColumn)
module.exports = createRenameColumnMigration('members', 'bio', 'expertise');
