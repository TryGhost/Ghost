import type { Controller, Frame } from '@tryghost/api-framework';
import { brandingService } from '../../services/stripe-checkout-config';
import type { StripeCheckoutBranding } from '../../services/stripe-checkout-config';

/**
 * The checkout branding in the Stripe dashboard, for Admin's sketch of the checkout. Uses tier
 * permissions like the checkout config.
 */
const controller = {
  docName: 'checkout_branding',

  read: {
    headers: { cacheInvalidate: false },
    permissions: { docName: 'products', method: 'read' },
    query(): Promise<StripeCheckoutBranding> {
      return brandingService!.read();
    },
  },
} satisfies Controller<{ read: Frame }>;

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
