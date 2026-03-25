const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('member_gifts', 'stripe_credit_balance_transaction_id', {
    type: 'string',
    maxlength: 255,
    nullable: true
});
