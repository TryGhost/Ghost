const { dropTables } = require('../../utils');

// Stripe Checkout collection was configured per tier: the questions a tier asked and the
// options it collected with. That implementation is removed, and one configuration for the
// whole site will replace it. The feature is behind the private `stripeCheckoutCollection`
// flag, so nothing here is carried across, and a rollback recreates the tables empty.
//
// The bindings the questions hang off stay. They belong to custom fields, which keep there
// where a collected value lands.
//
// The shapes are pinned as they stand in schema.js before this migration, so a rollback
// keeps rebuilding them however schema.js moves on.
module.exports = dropTables(['products_checkout_fields', 'products_checkout_config'], {
  products_checkout_fields: {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
    binding_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      unique: true,
      references: 'members_metafield_bindings.id',
      cascadeDelete: true,
    },
    sort_order: { type: 'integer', nullable: false, unsigned: true, defaultTo: 0 },
    label: { type: 'string', maxlength: 191, nullable: true },
    optional: { type: 'boolean', nullable: false, defaultTo: true },
    created_at: { type: 'dateTime', nullable: false },
    updated_at: { type: 'dateTime', nullable: true },
  },
  products_checkout_config: {
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
  },
});
