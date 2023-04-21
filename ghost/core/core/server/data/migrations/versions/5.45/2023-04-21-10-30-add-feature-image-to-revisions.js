const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('post_revisions', 'feature_image', {
    type: 'string',
    maxlength: 2000,
    nullable: true
});
