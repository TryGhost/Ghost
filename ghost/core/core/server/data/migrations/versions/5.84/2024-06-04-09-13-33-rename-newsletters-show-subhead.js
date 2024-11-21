const {createRenameColumnMigration} = require('../../utils');

module.exports = createRenameColumnMigration('newsletters', 'show_subhead', 'show_subtitle');
