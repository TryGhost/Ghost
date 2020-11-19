const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'custom_excerpt', {
    type: 'string',
    maxlength: 2000,
    nullable: true
});
