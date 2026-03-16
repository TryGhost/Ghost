const {addTable} = require('../../utils');

module.exports = addTable('member_gifts', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    status: {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'pending',
        validations: {
            isIn: [['pending', 'purchased', 'redeemed', 'failed', 'refunded']]
        }
    },
    claim_token: {type: 'string', maxlength: 191, nullable: false, unique: true},
    delivery_method: {
        type: 'string',
        maxlength: 50,
        nullable: false,
        defaultTo: 'link',
        validations: {
            isIn: [['link', 'email']]
        }
    },
    recipient_email: {type: 'string', maxlength: 191, nullable: true, validations: {isEmail: true}},
    purchaser_email: {type: 'string', maxlength: 191, nullable: true, validations: {isEmail: true}},
    purchaser_name: {type: 'string', maxlength: 191, nullable: true},
    product_id: {type: 'string', maxlength: 24, nullable: false, references: 'products.id'},
    duration_months: {type: 'integer', nullable: false},
    amount: {type: 'integer', nullable: false},
    currency: {type: 'string', maxlength: 50, nullable: false},
    stripe_checkout_session_id: {type: 'string', maxlength: 255, nullable: true, unique: true},
    stripe_payment_intent_id: {type: 'string', maxlength: 255, nullable: true},
    redeemed_by_member_id: {type: 'string', maxlength: 24, nullable: true, references: 'members.id', setNullDelete: true},
    redeemed_at: {type: 'dateTime', nullable: true},
    access_expires_at: {type: 'dateTime', nullable: true},
    ended_at: {type: 'dateTime', nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true},
    '@@INDEXES@@': [
        ['recipient_email'],
        ['redeemed_by_member_id'],
        ['status', 'redeemed_by_member_id']
    ]
});
