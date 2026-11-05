import type { ActionKind } from '../../lib/action-log/action-log';

/** Changes to the site's one Stripe Checkout config, which are only ever edits. */
export const stripeCheckoutConfigActions = {
  resourceType: 'stripe_checkout_config',
  table: 'stripe_checkout_config',
  actionNames: {},
} as const satisfies ActionKind;
