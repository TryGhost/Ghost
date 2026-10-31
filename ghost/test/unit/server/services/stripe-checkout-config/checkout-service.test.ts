import assert from 'node:assert/strict';
import sinon from 'sinon';
import { createLoggingFake } from '../../../../utils/logging-utils';
import { CheckoutService } from '../../../../../core/server/services/stripe-checkout-config/checkout-service';

describe('CheckoutService', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('gives no checkout settings when the config cannot be read, so the checkout still takes payment', async function () {
    const logging = createLoggingFake();
    const checkouts = new CheckoutService({
      config: {
        readForCheckout: async () => {
          throw new Error('database unavailable');
        },
      },
      labs: { isSet: () => true },
      logging,
    });

    assert.equal(await checkouts.readForTier('tier_1'), null);
    sinon.assert.calledOnce(logging.error);
  });
});
