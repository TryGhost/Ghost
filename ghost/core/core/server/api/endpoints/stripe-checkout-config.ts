import type { Controller, Frame } from '@tryghost/api-framework';
import { actingContext, service as checkoutConfig } from '../../services/stripe-checkout-config';
import type { StripeCheckoutConfig } from '../../services/stripe-checkout-config';

type EditFrame = Frame<{ data: { checkout_config: unknown[] } }>;

/**
 * The site-wide Stripe Checkout config.
 *
 * It uses the tier permissions, because checkout is where tiers are sold. Saving it doesn't
 * clear the site's cache, as no page on the site shows it.
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
    headers: { cacheInvalidate: false },
    permissions: { docName: 'products', method: 'edit' },
    async query(frame: EditFrame): Promise<StripeCheckoutConfig> {
      await checkoutConfig!.edit(
        actingContext(frame.options.context),
        frame.data.checkout_config[0],
      );
      return checkoutConfig!.read();
    },
  },
} satisfies Controller<{
  read: Frame;
  edit: EditFrame;
}>;

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
