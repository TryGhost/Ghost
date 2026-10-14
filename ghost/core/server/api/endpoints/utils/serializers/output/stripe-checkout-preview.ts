import type { Frame } from '@tryghost/api-framework';
import { toCheckoutPreviewResponse } from '../../../../../services/stripe-checkout-config';

const serialize = (preview: { url: string }, _apiConfig: unknown, frame: Frame): void => {
  frame.response = toCheckoutPreviewResponse.parse(preview);
};

// module.exports (not export): the API framework loads serializers via require().
module.exports = {
  add: serialize,
};
