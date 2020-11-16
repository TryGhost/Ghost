const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('emails', 'recipient_filter', {
    type: 'string',
    maxlength: 50,
    nullable: false,
    defaultTo: 'paid'
});
