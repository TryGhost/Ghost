const { combineNonTransactionalMigrations, addTable } = require('../../utils');

module.exports = combineNonTransactionalMigrations(
  addTable('products_checkout_fields', {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
    binding_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      unique: true,
      references: 'members_custom_field_bindings.id',
      cascadeDelete: true,
    },
    sort_order: { type: 'integer', nullable: false, unsigned: true, defaultTo: 0 },
    label: { type: 'string', maxlength: 191, nullable: true },
    optional: { type: 'boolean', nullable: false, defaultTo: true },
    created_at: { type: 'dateTime', nullable: false },
    updated_at: { type: 'dateTime', nullable: true },
  }),
  addTable('products_checkout_config', {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
    product_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      unique: true,
      references: 'products.id',
      cascadeDelete: true,
    },
    shipping_allowed_countries: { type: 'string', maxlength: 2000, nullable: true },
    tax_number_collect: { type: 'boolean', nullable: false, defaultTo: false },
    created_at: { type: 'dateTime', nullable: false },
    updated_at: { type: 'dateTime', nullable: true },
  }),
);
