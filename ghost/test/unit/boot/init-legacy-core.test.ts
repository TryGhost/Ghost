import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { loadBootFunction } from './harness';

// The feature services that used to start among the shared modules. They start
// after the shared and domain layers now, in the order they always had.
function createLegacyCoreHarness() {
  const giftLinks = { init: sinon.stub().resolves() };
  const integrations = { init: sinon.stub().resolves() };
  const stripeCheckoutConfig = { init: sinon.stub().resolves() };
  const initLegacyCore = loadBootFunction('initLegacyCore', {
    './server/services/gift-links': { default: giftLinks },
    './server/services/members-metafields': { init() {} },
    './server/services/app-installations': { default: { init() {} } },
    './server/services/export-requests': { default: { init() {} } },
    './server/services/invites': { default: { init() {} } },
    './server/services/integrations': { default: integrations },
    './server/services/stripe-checkout-config': { default: stripeCheckoutConfig },
  });
  return {
    init: (): Promise<void> => initLegacyCore({ config: { get: () => ({}) } }),
    giftLinks,
    integrations,
    stripeCheckoutConfig,
  };
}

it('starts nothing that belongs to the shared layer', async function () {
  // The harness fails on any dependency it was not given, so listing only the
  // feature services proves this step requires no shared module.
  const boot = createLegacyCoreHarness();

  await boot.init();

  sinon.assert.calledOnce(boot.giftLinks.init);
  sinon.assert.calledOnce(boot.stripeCheckoutConfig.init);
});

it('waits for Integrations initialization before continuing or resolving initLegacyCore', async function () {
  const boot = createLegacyCoreHarness();
  const ready = Promise.withResolvers<void>();
  boot.integrations.init.returns(ready.promise);
  let completed = false;
  const startup = boot.init().then(() => {
    completed = true;
  });

  try {
    await setImmediate();
    sinon.assert.calledOnce(boot.integrations.init);
    sinon.assert.notCalled(boot.stripeCheckoutConfig.init);
    assert.equal(completed, false);
  } finally {
    ready.resolve();
    await Promise.allSettled([startup]);
  }
  await startup;

  sinon.assert.calledOnce(boot.stripeCheckoutConfig.init);
  assert.equal(completed, true);
});

it('propagates the original Integrations initialization error without continuing initLegacyCore', async function () {
  const boot = createLegacyCoreHarness();
  const failure = new Error('Integrations initialization failed');
  boot.integrations.init.rejects(failure);

  await assert.rejects(boot.init(), (error) => error === failure);

  sinon.assert.calledOnce(boot.integrations.init);
  sinon.assert.notCalled(boot.stripeCheckoutConfig.init);
});
