// For information on writing migrations, see https://www.notion.so/ghost/Database-migrations-eb5b78c435d741d2b34a582d57c24253

const {createAddColumnMigration} = require('../../utils');

module.exports = createAddColumnMigration('donation_payment_events', 'donation_message', {
    type: 'string',
    maxlength: 255, // as per stripe limitation for custom fields https://docs.stripe.com/payments/checkout/custom-fields
    nullable: true
});
