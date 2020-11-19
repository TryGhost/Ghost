const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'custom_template', {
    type: 'string',
    maxlength: 100,
    nullable: true
});
