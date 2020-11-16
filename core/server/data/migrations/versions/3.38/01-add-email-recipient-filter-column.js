const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('posts', 'email_recipient_filter', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'none'
});
