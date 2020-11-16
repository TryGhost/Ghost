const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_stripe_customers', 'email', {
    type: 'string',
    maxlength: 191,
    nullable: true
});
