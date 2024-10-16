const {createRenameColumnMigration} = require('../../utils');

module.exports = createRenameColumnMigration('newsletters', 'show_subtitle', 'show_excerpt');
