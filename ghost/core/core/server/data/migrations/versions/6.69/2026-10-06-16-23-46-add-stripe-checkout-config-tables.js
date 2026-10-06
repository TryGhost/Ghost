const { addTable, combineNonTransactionalMigrations } = require('../../utils');

module.exports = combineNonTransactionalMigrations(
  addTable('stripe_checkout_config', {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
    slug: { type: 'string', maxlength: 191, nullable: false, unique: true },
    shipping: { type: 'text', maxlength: 65535, nullable: true },
    phone: { type: 'text', maxlength: 65535, nullable: true },
    tax_number: { type: 'text', maxlength: 65535, nullable: true },
    created_at: { type: 'dateTime', nullable: false },
    updated_at: { type: 'dateTime', nullable: true },
  }),
  addTable('stripe_checkout_config_tiers', {
    section: {
      type: 'string',
      maxlength: 50,
      nullable: false,
      validations: { isIn: [['shipping', 'phone', 'tax_number']] },
    },
    product_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      references: 'products.id',
      cascadeDelete: true,
    },
    '@@PRIMARY_KEY@@': ['section', 'product_id'],
  }),
);
