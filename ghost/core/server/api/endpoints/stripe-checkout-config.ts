import type { Controller, Frame } from '@tryghost/api-framework';
import stripeCheckoutConfig from '../../services/stripe-checkout-config';
import type { StripeCheckoutConfig } from '../../services/stripe-checkout-config';
import { COLLECTION_FLAG } from '../../services/stripe-checkout-config/models';
import { refuseCollectionWhileOff } from '../../services/stripe-checkout-config/serializers';
import { actingContext } from '../../lib/actor';

const labs = require('../../../shared/labs');

type EditFrame = Frame<{ data: { checkout_config: unknown[] } }>;

/**
 * The site-wide Stripe Checkout config.
 *
 * It uses the tier permissions, because checkout is where tiers are sold. A save clears the
 * site's cache only when it changes what tiers list to anyone: a requirement, whether each of its
 * ports is bound, or the field a port names. The collected parts are only read and saved while
 * their private flag is on.
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
      const { config, changedRequirements } = await stripeCheckoutConfig.service.config.edit(
        actingContext(frame.options.context),
        input,
      );
      if (changedRequirements) {
        frame.setHeader('X-Cache-Invalidate', '/*');
      }
      return config;
    },
  },
} satisfies Controller<{
  read: Frame;
  edit: EditFrame;
}>;

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
