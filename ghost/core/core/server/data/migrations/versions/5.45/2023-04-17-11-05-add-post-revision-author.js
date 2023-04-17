const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('post_revisions', 'created_by', {
    type: 'string',
    maxlength: 24,
    nullable: true
});
