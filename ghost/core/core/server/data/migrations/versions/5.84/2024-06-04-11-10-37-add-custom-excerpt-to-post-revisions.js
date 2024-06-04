const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('post_revisions', 'custom_excerpt', {
    type: 'text',
    maxlength: 2000,
    nullable: true
});
