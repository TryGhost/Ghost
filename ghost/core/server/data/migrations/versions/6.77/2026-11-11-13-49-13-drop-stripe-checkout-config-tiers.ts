const { dropTables } = require('../../utils');

// The tax ID was the last Stripe Checkout setting that listed its tiers here: shipping and the
// phone number keep theirs as tier requirements. Tax ID collection is removed from the Stripe
// Checkout settings, so the table goes. It is behind the private `stripeCheckoutCollection` flag,
// so the tiers it listed are discarded, and a rollback recreates the table empty.
//
// The shape is pinned as it stands in schema.js before this migration, so a rollback keeps
// rebuilding it however schema.js moves on.
module.exports = dropTables(['stripe_checkout_config_tiers'], {
  stripe_checkout_config_tiers: {
    section: {
      type: 'string',
      maxlength: 50,
      nullable: false,
      validations: { isIn: [['tax_number']] },
    },
    product_id: {
      type: 'string',
      maxlength: 24,
      nullable: false,
      references: 'products.id',
      cascadeDelete: true,
    },
    '@@PRIMARY_KEY@@': ['section', 'product_id'],
  },
});
