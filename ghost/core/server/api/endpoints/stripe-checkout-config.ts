import errors from '@tryghost/errors';
import type { Controller, Frame } from '@tryghost/api-framework';
import {
  SHIPPING_FLAG,
  actingContext,
  service as checkoutConfig,
} from '../../services/stripe-checkout-config';
import type { StripeCheckoutConfig } from '../../services/stripe-checkout-config';

const labs = require('../../../shared/labs');

type EditFrame = Frame<{ data: { checkout_config: unknown[] } }>;

/** Shipping is still in development, so it can't be saved while its flag is off. */
function refuseShippingWhileOff(input: unknown): void {
  if (labs.isSet(SHIPPING_FLAG) || typeof input !== 'object' || input === null) {
    return;
  }
  if ('shipping' in input) {
    throw new errors.ValidationError({
      message: 'Shipping address collection is not available yet.',
      property: 'shipping',
    });
  }
}

/**
 * The site-wide Stripe Checkout config.
 *
 * It uses the tier permissions, because checkout is where tiers are sold. Saving it doesn't
 * clear the site's cache, as no page on the site shows it. Shipping is only read and saved
 * while its private flag is on.
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
      const [input] = frame.data.checkout_config;
      refuseShippingWhileOff(input);
      await checkoutConfig!.edit(actingContext(frame.options.context), input);
      return checkoutConfig!.read();
    },
  },
} satisfies Controller<{
  read: Frame;
  edit: EditFrame;
}>;

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
