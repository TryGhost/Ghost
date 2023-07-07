const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'show_title_and_feature_image', {
    type: 'boolean',
    nullable: false,
    defaultTo: true
});
