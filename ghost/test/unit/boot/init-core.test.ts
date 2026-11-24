import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { loadBootFunction } from './harness';

function createCoreHarness() {
  const settings = {
    init: sinon.stub().resolves(),
    syncEmailSettings: sinon.stub().resolves(),
  };
  const signingKeys = { init: sinon.stub().resolves() };
  const i18n = { init: sinon.stub().resolves() };
  const giftLinks = { init: sinon.stub().resolves() };
  const siteScope = { start: sinon.stub(), stop: sinon.stub() };
  const stripeCheckoutConfig = { init: sinon.stub().resolves() };
  const applyImageUploadConfig = sinon.stub();
  const uploads = {};
  const initCore = loadBootFunction('initCore', {
    './server/services/adapter-manager': { default: { init() {} } },
    './server/lib/image/image-upload-config': { applyImageUploadConfig },
    './shared/url-utils': {},
    './server/services/limits': { init: async () => {} },
    './server/services/settings/settings-service': settings,
    './server/services/signing-keys': { default: signingKeys },
    './server/services/internal-keys': { default: { init() {} } },
    './server/lib/common/events': {},
    './shared/i18n': i18n,
    './server/auth': { isBetterAuth: false },
    './server/services/gift-links': { default: giftLinks },
    './server/services/members-metafields': { init() {} },
    './server/services/app-installations': { default: { init() {} } },
    '../bootstrap/transition/single-site': siteScope,
    './server/services/jobs-service': { shutdown() {} },
    './server/services/invites': { default: { init() {} } },
    './server/services/stripe-checkout-config': { default: stripeCheckoutConfig },
  });
  return {
    init: (ghostServer?: { registerCleanupTask: sinon.SinonStub }): Promise<void> =>
      initCore({
        ghostServer,
        config: { get: (key: string) => (key === 'uploads' ? uploads : {}) },
      }),
    applyImageUploadConfig,
    uploads,
    settings,
    signingKeys,
    i18n,
    giftLinks,
    siteScope,
    stripeCheckoutConfig,
  };
}

for (const stage of ['init', 'syncEmailSettings'] as const) {
  it(`waits for settings.${stage} before initializing signing keys`, async function () {
    const boot = createCoreHarness();
    const ready = Promise.withResolvers<void>();
    boot.settings[stage].returns(ready.promise);
    const startup = boot.init();

    try {
      await setImmediate();
      sinon.assert.calledOnce(boot.settings[stage]);
      sinon.assert.notCalled(boot.signingKeys.init);
    } finally {
      ready.resolve();
      await Promise.allSettled([startup]);
    }
    await startup;

    sinon.assert.calledOnce(boot.signingKeys.init);
    sinon.assert.callOrder(
      boot.settings.init,
      boot.settings.syncEmailSettings,
      boot.signingKeys.init,
    );
  });
}

it('waits for signing-key initialization before continuing or resolving initCore', async function () {
  const boot = createCoreHarness();
  const ready = Promise.withResolvers<void>();
  boot.signingKeys.init.returns(ready.promise);
  let completed = false;
  const startup = boot.init().then(() => {
    completed = true;
  });

  try {
    await setImmediate();
    sinon.assert.calledOnce(boot.signingKeys.init);
    sinon.assert.notCalled(boot.i18n.init);
    assert.equal(completed, false);
  } finally {
    ready.resolve();
    await Promise.allSettled([startup]);
  }
  await startup;

  sinon.assert.calledOnce(boot.i18n.init);
  assert.equal(completed, true);
});

it('propagates the original signing-key initialization error without continuing initCore', async function () {
  const boot = createCoreHarness();
  const failure = new Error('signing-key initialization failed');
  boot.signingKeys.init.rejects(failure);

  await assert.rejects(boot.init(), (error) => error === failure);

  sinon.assert.calledOnce(boot.signingKeys.init);
  sinon.assert.notCalled(boot.i18n.init);
});

it('waits for i18n initialization before continuing or resolving initCore', async function () {
  const boot = createCoreHarness();
  const ready = Promise.withResolvers<void>();
  boot.i18n.init.returns(ready.promise);
  let completed = false;
  const startup = boot.init().then(() => {
    completed = true;
  });

  try {
    await setImmediate();
    sinon.assert.calledOnce(boot.i18n.init);
    sinon.assert.notCalled(boot.giftLinks.init);
    assert.equal(completed, false);
  } finally {
    ready.resolve();
    await Promise.allSettled([startup]);
  }
  await startup;

  sinon.assert.calledOnce(boot.giftLinks.init);
  assert.equal(completed, true);
});

it('propagates the original i18n initialization error without continuing initCore', async function () {
  const boot = createCoreHarness();
  const failure = new Error('i18n initialization failed');
  boot.i18n.init.rejects(failure);

  await assert.rejects(boot.init(), (error) => error === failure);

  sinon.assert.calledOnce(boot.i18n.init);
  sinon.assert.notCalled(boot.giftLinks.init);
});

it('opens the site scope once, before the services that follow it', async function () {
  const boot = createCoreHarness();

  await boot.init();

  sinon.assert.calledOnceWithExactly(boot.siteScope.start);
  sinon.assert.callOrder(boot.siteScope.start, boot.stripeCheckoutConfig.init);
  sinon.assert.notCalled(boot.siteScope.stop);
});

it('fails initCore with the same error when the site scope cannot open', async function () {
  const boot = createCoreHarness();
  const failure = new Error('A declaration is invalid');
  boot.siteScope.start.throws(failure);

  await assert.rejects(boot.init(), (error) => error === failure);

  sinon.assert.notCalled(boot.stripeCheckoutConfig.init);
});

it('ends the site scope as a server cleanup task', async function () {
  const boot = createCoreHarness();
  const registerCleanupTask = sinon.stub();

  await boot.init({ registerCleanupTask });

  const registrations = registerCleanupTask
    .getCalls()
    .filter((call) => call.args[1] === 'Site scope');
  assert.equal(registrations.length, 1);
  registrations[0]!.args[0]();
  sinon.assert.calledOnceWithExactly(boot.siteScope.stop);
});

it('applies the uploads config to image handling before anything initializes', async function () {
  const boot = createCoreHarness();
  await boot.init();

  sinon.assert.calledOnceWithExactly(boot.applyImageUploadConfig, sinon.match.same(boot.uploads));
  sinon.assert.callOrder(boot.applyImageUploadConfig, boot.settings.init);
});
