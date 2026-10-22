import type { Controller, Frame } from '@tryghost/api-framework';
import stripeCheckoutConfig from '../../services/stripe-checkout-config';
import type { StripeCheckoutConfig } from '../../services/stripe-checkout-config';
import { COLLECTION_FLAG } from '../../services/stripe-checkout-config/models';
import { refuseCollectionWhileOff } from '../../services/stripe-checkout-config/serializers';

const labs = require('../../../shared/labs');

type EditFrame = Frame<{ data: { checkout_config: unknown[] } }>;

/**
 * The site-wide Stripe Checkout config.
 *
 * It uses the tier permissions, because checkout is where tiers are sold. A save clears the
 * site's cache only when it changes what tiers list to anyone: a requirement, or whether its parts
 * can be asked for. The collected parts are only read and saved while their private flag is on.
 */
const controller = {
  docName: 'checkout_config',

  read: {
    headers: { cacheInvalidate: false },
    permissions: { docName: 'products', method: 'read' },
    query(): Promise<StripeCheckoutConfig> {
      return stripeCheckoutConfig.service.config.read();
    },
  },

  edit: {
    headers: { cacheInvalidate: false },
    permissions: { docName: 'products', method: 'edit' },
    async query(frame: EditFrame): Promise<StripeCheckoutConfig> {
      const [input] = frame.data.checkout_config;
      refuseCollectionWhileOff(input, labs.isSet(COLLECTION_FLAG));
      const { config } = stripeCheckoutConfig.service;
      const { changedRequirements } = await config.edit(
        stripeCheckoutConfig.extras.actingContext(frame.options.context),
        input,
      );
      if (changedRequirements) {
        frame.setHeader('X-Cache-Invalidate', '/*');
      }
      return config.read();
    },
  },
} satisfies Controller<{
  read: Frame;
  edit: EditFrame;
}>;

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
