import { toCheckoutConfigResponse } from '../../../../../services/tier-checkout-config';
import type { CheckoutConfigResult } from '../../../../../services/tier-checkout-config';

interface Frame {
  response?: unknown;
}

const serialize = (result: CheckoutConfigResult, _apiConfig: unknown, frame: Frame): void => {
  frame.response = toCheckoutConfigResponse.parse(result);
};

// module.exports (not export): the API framework loads serializers via require(). The endpoint ->
// serializer mapping lives here; the response shaping lives with the tier-checkout-config service.
module.exports = {
  browse: serialize,
  read: serialize,
  edit: serialize,
};
