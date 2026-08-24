const { createAddColumnMigration } = require('../../utils');

// Which billing cadences a paid tier offers at signup: both (the default),
// monthly only, or yearly only. Restricting a cadence hides it from sale —
// the price columns are untouched, because existing subscriptions and
// already-sold gifts still reference their Stripe prices.
module.exports = createAddColumnMigration('products', 'available_cadences', {
  type: 'string',
  maxlength: 50,
  nullable: false,
  defaultTo: 'all',
});
