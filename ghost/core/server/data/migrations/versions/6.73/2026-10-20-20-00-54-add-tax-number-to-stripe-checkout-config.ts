const { createAddColumnMigration } = require('../../utils');

module.exports = createAddColumnMigration('stripe_checkout_config', 'tax_number', {
  type: 'text',
  maxlength: 65535,
  nullable: true,
});
