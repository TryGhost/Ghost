const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'type', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'post'
});
