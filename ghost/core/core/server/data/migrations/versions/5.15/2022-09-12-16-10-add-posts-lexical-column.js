const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'lexical', {
    type: 'text',
    maxlength: 1000000000,
    fieldtype: 'long',
    nullable: true
});
