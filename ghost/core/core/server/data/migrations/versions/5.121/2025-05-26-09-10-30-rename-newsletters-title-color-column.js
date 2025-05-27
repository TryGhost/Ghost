const {createRenameColumnMigration} = require('../../utils');

module.exports = createRenameColumnMigration('newsletters', 'title_color', 'post_title_color');