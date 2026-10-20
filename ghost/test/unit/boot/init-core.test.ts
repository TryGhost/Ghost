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
  const initCore = loadBootFunction('initCore', {
    './server/services/adapter-manager': { default: { init() {} } },
    './server/lib/image/image-decoders': { restrictImageDecoders() {} },
    './server/lib/image/image-content': {
      IMAGE_UPLOAD_TYPES: [],
      getIgnoredImageContentTypes: () => [],
    },
    './shared/url-utils': {},
    './server/services/limits': { init: async () => {} },
    './server/services/settings/settings-service': settings,
    './server/services/signing-keys': { default: signingKeys },
    './server/services/internal-keys': { default: { init() {} } },
    './server/services/i18n': i18n,
    './server/services/gift-links': { init() {} },
    './server/services/members-metafields': { init() {} },
    './server/services/app-installations': { default: { init() {} } },
    './server/services/export-requests': { default: { init() {} } },
    './server/services/invites': { default: { init() {} } },
    './server/services/support-requests': { default: { init() {} } },
    './server/services/stripe-checkout-config': { default: { init() {} } },
  });
  return {
    init: (): Promise<void> => initCore({ config: { get: () => ({}) } }),
    settings,
    signingKeys,
    i18n,
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
