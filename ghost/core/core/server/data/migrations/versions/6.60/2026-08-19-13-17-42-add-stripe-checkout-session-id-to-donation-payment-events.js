const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('donation_payment_events', 'stripe_checkout_session_id', {
  type: 'string',
  maxlength: 255,
  nullable: true,
  unique: true,
});
