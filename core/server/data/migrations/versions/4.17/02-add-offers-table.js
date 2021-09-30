const utils = require('../../utils');

module.exports = utils.addTable('offers', {
    id: {type: 'string', maxlength: 24, nullable: false, primary: true},
    name: {type: 'string', maxlength: 191, nullable: false, unique: true},
    code: {type: 'string', maxlength: 191, nullable: false, unique: true},
    product_id: {type: 'string', maxlength: 24, nullable: false},
    stripe_coupon_id: {type: 'string', maxlength: 255, nullable: false, unique: true},
    interval: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['month', 'year']]}},
    currency: {type: 'string', maxlength: 50, nullable: true},
    discount_type: {type: 'string', maxlength: 50, nullable: false, validations: {isIn: [['percent', 'amount']]}},
    discount_amount: {type: 'integer', nullable: false},
    duration: {type: 'string', maxlength: 50, nullable: false},
    duration_in_months: {type: 'integer', nullable: true},
    portal_title: {type: 'string', maxlength: 191, nullable: false},
    portal_description: {type: 'string', maxlength: 2000, nullable: true},
    created_at: {type: 'dateTime', nullable: false},
    updated_at: {type: 'dateTime', nullable: true}
});
