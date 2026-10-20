import type { Frame } from '@tryghost/api-framework';
import {
  COLLECTION_FLAG,
  toCheckoutConfigResponse,
} from '../../../../../services/stripe-checkout-config';
import type { StripeCheckoutConfig } from '../../../../../services/stripe-checkout-config';

const labs = require('../../../../../../shared/labs');

const serialize = (config: StripeCheckoutConfig, _apiConfig: unknown, frame: Frame): void => {
  // The collected parts are still in development, so staff only see them while their flag is on.
  frame.response = toCheckoutConfigResponse.parse(
    labs.isSet(COLLECTION_FLAG) ? config : { design: config.design },
  );
};

// module.exports (not export): the API framework loads serializers via require().
module.exports = {
  read: serialize,
  edit: serialize,
};
