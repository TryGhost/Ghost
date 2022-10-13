const {addTable} = require('../../utils');

module.exports = addTable('subscriptions', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    type: {type: 'string', maxlength: 50, nullable: false},
    status: {type: 'string', maxlength: 50, nullable: false},
    member_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'members.id', cascadeDelete: true},
    tier_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'products.id'},
    cadence: {type: 'string', maxlength: 50, nullable: true},
    currency: {type: 'string', maxlength: 50, nullable: true},
    amount: {type: 'integer', nullable: true},
    payment_provider: {type: 'string', maxlength: 50, nullable: true},
    payment_subscription_url: {type: 'string', maxlength: 2000, nullable: true},
    payment_user_url: {type: 'string', maxlength: 2000, nullable: true},
    offer_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'offers.id'},
    expires_at: {type: 'dateTime', nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
