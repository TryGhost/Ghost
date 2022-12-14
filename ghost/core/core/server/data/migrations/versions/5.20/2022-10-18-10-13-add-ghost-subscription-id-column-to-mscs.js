const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('members_stripe_customers_subscriptions', 'ghost_subscription_id', {
    type: 'string',
    maxlength: 24,
    nullable: true,
    references: 'subscriptions.id',
    constraintName: 'mscs_ghost_subscription_id_foreign',
    cascadeDelete: true
});
