const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_stripe_customers', 'name', {
    type: 'string',
    maxlength: 191,
    nullable: true
});
