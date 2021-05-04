const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'feature_image_alt', {
    type: 'string',
    maxlength: 300,
    nullable: true,
    unique: false,
    defaultTo: '',
    index: true
});