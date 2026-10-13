import type { Frame } from '@tryghost/api-framework';
import { toCheckoutBrandingResponse } from '../../../../../services/stripe-checkout-config';
import type { StripeCheckoutBranding } from '../../../../../services/stripe-checkout-config';

const serialize = (branding: StripeCheckoutBranding, _apiConfig: unknown, frame: Frame): void => {
  frame.response = toCheckoutBrandingResponse.parse(branding);
};

// module.exports (not export): the API framework loads serializers via require().
module.exports = {
  read: serialize,
};
