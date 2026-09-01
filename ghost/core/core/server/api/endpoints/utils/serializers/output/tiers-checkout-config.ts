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
};
