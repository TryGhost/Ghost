const assert = require('node:assert/strict');
const sinon = require('sinon');
const config = require('../../../../../core/shared/config');
const {
  getMachinePaymentsStripeOptions,
} = require('../../../../../core/server/services/machine-payments/stripe/stripe-client-options');

describe('Unit: server/services/machine-payments/stripe-client-options', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('includes apiVersion only when no STRIPE_API_* overrides are set', function () {
    sinon.stub(config, 'get').callsFake((key) => {
      if (key === 'STRIPE_API_HOST' || key === 'STRIPE_API_PORT' || key === 'STRIPE_API_PROTOCOL') {
        return undefined;
      }
      return undefined;
    });

    assert.deepEqual(getMachinePaymentsStripeOptions('2026-05-27.preview'), {
      apiVersion: '2026-05-27.preview',
    });
  });

  it('honours STRIPE_API_HOST/PORT/PROTOCOL for the fake Stripe server', function () {
    sinon.stub(config, 'get').callsFake((key) => {
      if (key === 'STRIPE_API_HOST') {
        return 'host.docker.internal';
      }
      if (key === 'STRIPE_API_PORT') {
        return '4242';
      }
      if (key === 'STRIPE_API_PROTOCOL') {
        return 'http';
      }
      return undefined;
    });

    assert.deepEqual(getMachinePaymentsStripeOptions('2026-05-27.preview'), {
      apiVersion: '2026-05-27.preview',
      host: 'host.docker.internal',
      port: 4242,
      protocol: 'http',
    });
  });
});
