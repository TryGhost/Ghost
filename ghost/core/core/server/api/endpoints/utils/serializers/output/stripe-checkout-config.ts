import type { Frame } from '@tryghost/api-framework';
import { toCheckoutConfigResponse } from '../../../../../services/stripe-checkout-config';
import type { StripeCheckoutConfig } from '../../../../../services/stripe-checkout-config';

const serialize = (config: StripeCheckoutConfig, _apiConfig: unknown, frame: Frame): void => {
  frame.response = toCheckoutConfigResponse.parse(config);
};

// module.exports (not export): the API framework loads serializers via require().
module.exports = {
  read: serialize,
  edit: serialize,
};
