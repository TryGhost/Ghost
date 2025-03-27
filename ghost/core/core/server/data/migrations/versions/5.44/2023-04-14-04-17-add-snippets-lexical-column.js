const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('snippets', 'lexical', {
    type: 'text',
    maxlength: 1000000000,
    fieldtype: 'long',
    nullable: true
});
