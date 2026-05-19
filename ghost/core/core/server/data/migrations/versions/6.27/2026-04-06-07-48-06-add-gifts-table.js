const {addTable} = require('../../utils');

module.exports = addTable('gifts', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    token: {type: 'string', maxlength: 48, nullable: false, unique: true},

    buyer_email: {type: 'string', maxlength: 191, nullable: false},
    buyer_member_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'members.id', setNullDelete: true},

    redeemer_member_id: {type: 'string', maxlength: 24, nullable: true, unique: false, references: 'members.id', setNullDelete: true},

    tier_id: {type: 'string', maxlength: 24, nullable: false, unique: false, references: 'products.id'},
    cadence: {type: 'string', maxlength: 50, nullable: false},
    duration: {type: 'integer', nullable: false, unsigned: true},

    currency: {type: 'string', maxlength: 50, nullable: false},
    amount: {type: 'integer', nullable: false, unsigned: true},

    stripe_checkout_session_id: {type: 'string', maxlength: 255, nullable: false, unique: true},
    stripe_payment_intent_id: {type: 'string', maxlength: 255, nullable: false, unique: true},

    consumes_at: {type: 'dateTime', nullable: true},
    expires_at: {type: 'dateTime', nullable: true},

    status: {type: 'string', maxlength: 50, nullable: false},
    purchased_at: {type: 'dateTime', nullable: false},
    redeemed_at: {type: 'dateTime', nullable: true},
    consumed_at: {type: 'dateTime', nullable: true},
    expired_at: {type: 'dateTime', nullable: true},
    refunded_at: {type: 'dateTime', nullable: true}
});
