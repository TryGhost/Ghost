const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts_meta', 'feature_image_caption', {
    type: 'text',
    maxlength: 65535,
    nullable: true
});
