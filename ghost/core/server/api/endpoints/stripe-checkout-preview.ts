import type { Controller, Frame } from '@tryghost/api-framework';
import stripeCheckoutConfig from '../../services/stripe-checkout-config';
import { COLLECTION_FLAG } from '../../services/stripe-checkout-config/models';
import { refuseCollectionWhileOff } from '../../services/stripe-checkout-config/serializers';

const labs = require('../../../shared/labs');

type AddFrame = Frame<{ data: { checkout_preview: unknown[] } }>;

/**
 * A real Stripe Checkout page for a paid tier, from checkout settings that need not be saved,
 * for Admin to open in a new tab: Stripe refuses to run Checkout inside another page. Takes
 * and refuses settings as saving them does, and uses tier permissions like the checkout config.
 */
const controller = {
  docName: 'checkout_preview',

  add: {
    headers: { cacheInvalidate: false },
    permissions: { docName: 'products', method: 'edit' },
    query(frame: AddFrame): Promise<{ url: string }> {
      const [input] = frame.data.checkout_preview;
      refuseCollectionWhileOff(input, labs.isSet(COLLECTION_FLAG));
      return stripeCheckoutConfig.service.previews.add(input);
    },
  },
} satisfies Controller<{ add: AddFrame }>;

// module.exports (not export): the API framework loads controllers via require().
module.exports = controller;
