import { createDropColumnMigration } from '../../utils';

// Tax ID collection is removed from the Stripe Checkout settings, so its column goes. It is
// behind the private `stripeCheckoutCollection` flag, so the saved setting is discarded, and a
// rollback adds the column back empty.
export default createDropColumnMigration(
  'stripe_checkout_config',
  'tax_number',
  { type: 'text', maxlength: 65535, nullable: true },
  { algorithm: 'auto' },
);
