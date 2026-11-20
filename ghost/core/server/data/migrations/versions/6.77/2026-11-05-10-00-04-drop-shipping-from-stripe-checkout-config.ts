import { createDropColumnMigration } from '../../utils';

// Shipping has nothing of Stripe's own left to keep: which tiers ask for an address, and the
// countries it must be in, are its tier requirement.
export default createDropColumnMigration('stripe_checkout_config', 'shipping', {
  type: 'text',
  maxlength: 65535,
  nullable: true,
});
