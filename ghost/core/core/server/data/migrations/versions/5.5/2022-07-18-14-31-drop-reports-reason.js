const {createDropColumnMigration} = require('../../utils');

module.exports = createDropColumnMigration('comment_reports', 'reason', {type: 'text', maxlength: 65535, nullable: false});
