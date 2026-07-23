const {createAddColumnMigration} = require('../../utils');

// The buyer can name who the gift is for, so the delivery email and gift card
// can greet the recipient personally.
module.exports = createAddColumnMigration('gifts', 'recipient_name', {
    type: 'string',
    maxlength: 191,
    nullable: true
});
