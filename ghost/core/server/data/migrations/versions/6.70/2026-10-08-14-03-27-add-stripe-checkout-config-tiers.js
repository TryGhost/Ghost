const { addTable } = require('../../utils');

module.exports = addTable('stripe_checkout_config_tiers', {
  section: {
    type: 'string',
    maxlength: 50,
    nullable: false,
    validations: { isIn: [['shipping']] },
  },
  product_id: {
    type: 'string',
    maxlength: 24,
    nullable: false,
    references: 'products.id',
    cascadeDelete: true,
  },
  '@@PRIMARY_KEY@@': ['section', 'product_id'],
});
