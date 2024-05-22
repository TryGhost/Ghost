const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts_meta', 'feature_image_alt', {
    type: 'string',
    maxlength: 191,
    nullable: true
});
