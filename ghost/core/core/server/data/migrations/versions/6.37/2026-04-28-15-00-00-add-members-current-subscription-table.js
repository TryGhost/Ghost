const {addTable} = require('../../utils');

module.exports = addTable('members_current_subscription', {
    member_id: {type: 'string', maxlength: 24, nullable: false, primary: true, references: 'members.id', cascadeDelete: true},
    subscription_id: {type: 'string', maxlength: 24, nullable: false, references: 'members_stripe_customers_subscriptions.id', cascadeDelete: true}
});
