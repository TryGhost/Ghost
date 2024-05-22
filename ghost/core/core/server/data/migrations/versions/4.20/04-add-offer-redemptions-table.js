const {addTable} = require('../../utils');

module.exports = addTable('offer_redemptions', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    offer_id: {type: 'string', maxlength: 24, nullable: false, references: 'offers.id', cascadeDelete: true},
    member_id: {type: 'string', maxlength: 24, nullable: false, references: 'members.id', cascadeDelete: true},
    subscription_id: {type: 'string', maxlength: 24, nullable: false, references: 'members_stripe_customers_subscriptions.id', cascadeDelete: true},
    created_at: {type: 'dateTime', nullable: false}
});
