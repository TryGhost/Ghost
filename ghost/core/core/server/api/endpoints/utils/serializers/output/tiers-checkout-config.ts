import type { Frame } from '@tryghost/api-framework';
import { toCheckoutConfigResponse } from '../../../../../services/tier-checkout-config';
import type { TierCheckoutConfig } from '../../../../../services/tier-checkout-config';

const serialize = (configs: TierCheckoutConfig[], _apiConfig: unknown, frame: Frame): void => {
  frame.response = toCheckoutConfigResponse.parse(configs);
};

// module.exports (not export): the API framework loads serializers via require().
module.exports = {
  browse: serialize,
  read: serialize,
  edit: serialize,
};
