const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts_meta', 'hide_title_and_feature_image', {
    type: 'boolean',
    nullable: false,
    defaultTo: false
});
