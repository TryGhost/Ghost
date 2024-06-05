const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('post_revisions', 'custom_excerpt', {
    type: 'string',
    maxlength: 2000,
    nullable: true
});
