import { toCheckoutConfigResponse } from '../../../../../services/tier-checkout-config';
import type { TierCheckoutConfig } from '../../../../../services/tier-checkout-config';

interface Frame {
  response?: unknown;
}

const serialize = (configs: TierCheckoutConfig[], _apiConfig: unknown, frame: Frame): void => {
  frame.response = toCheckoutConfigResponse.parse(configs);
};

// module.exports (not export): the API framework loads serializers via require().
module.exports = {
  browse: serialize,
  read: serialize,
  edit: serialize,
  // POC: the hosted Stripe session URL for the checkout customisation preview.
  preview: (result: unknown, _apiConfig: unknown, frame: Frame): void => {
    frame.response = { tiers_checkout_preview: [result] };
  },
};
