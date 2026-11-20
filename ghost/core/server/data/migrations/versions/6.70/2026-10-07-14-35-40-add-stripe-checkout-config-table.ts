const { addTable } = require('../../utils');

module.exports = addTable('stripe_checkout_config', {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  slug: { type: 'string', maxlength: 191, nullable: false, unique: true },
  design: { type: 'text', maxlength: 65535, nullable: true },
  created_at: { type: 'dateTime', nullable: false },
  updated_at: { type: 'dateTime', nullable: true },
});
