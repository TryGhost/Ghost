const { createDropColumnMigration } = require('../../utils');

// The phone number has nothing of Stripe's own to keep: which tiers ask for it is a
// requirement on its custom field.
module.exports = createDropColumnMigration('stripe_checkout_config', 'phone', {
  type: 'text',
  maxlength: 65535,
  nullable: true,
});
