import type { Controller, Frame } from '@tryghost/api-framework';
import { service as checkoutConfig } from '../../services/stripe-checkout-config';
import type { StripeCheckoutConfig } from '../../services/stripe-checkout-config';

type EditFrame = Frame<{ data: { checkout_config?: unknown[] } }>;

/**
 * What Stripe Checkout collects beyond the payment, as one resource for the whole site.
 *
 * Each section names the tiers it applies to rather than living on a tier, so the tier
 * payload, which is generally available, carries none of it. A route of its own can carry
 * the flag, and be removed with it.
 *
 * Read and written through tier permissions, because what a checkout collects is part of
 * selling a tier.
 */
const controller = {
  docName: 'checkout_config',

  read: {
    headers: { cacheInvalidate: false },
    permissions: { docName: 'products', method: 'read' },
    query(): Promise<StripeCheckoutConfig> {
      return checkoutConfig!.read();
    },
  },

  edit: {
    headers: { cacheInvalidate: true },
    permissions: { docName: 'products', method: 'edit' },
    async query(frame: EditFrame): Promise<StripeCheckoutConfig> {
      await checkoutConfig!.edit(frame.data.checkout_config?.[0] ?? {});
      return checkoutConfig!.read();
    },
  },
} satisfies Controller<{
  read: Frame;
  edit: EditFrame;
}>;

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
