import type { Controller, Frame } from '@tryghost/api-framework';
import { previewService } from '../../services/stripe-checkout-config';

type AddFrame = Frame<{ data: { checkout_preview: unknown[] } }>;

/**
 * A real Stripe Checkout page for a paid tier, in a design that need not be saved, for Admin
 * to open in a new tab: Stripe refuses to run Checkout inside another page. Uses tier
 * permissions like the checkout config.
 */
const controller = {
  docName: 'checkout_preview',

  add: {
    headers: { cacheInvalidate: false },
    permissions: { docName: 'products', method: 'edit' },
    query(frame: AddFrame): Promise<{ url: string }> {
      return previewService!.add(frame.data.checkout_preview[0]);
    },
  },
} satisfies Controller<{ add: AddFrame }>;

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
