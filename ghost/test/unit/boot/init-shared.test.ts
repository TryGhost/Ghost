import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { loadBootFunction } from './harness';

// The harness fails on any dependency it was not given, so this list is the
// whole shared layer: adding a start to initShared fails every test here.
function createSharedHarness() {
  const limits = { init: sinon.stub().resolves() };
  const settings = {
    init: sinon.stub().resolves(),
    syncEmailSettings: sinon.stub().resolves(),
  };
  const signingKeys = { init: sinon.stub().resolves() };
  const internalKeys = { init: sinon.stub().resolves() };
  const i18n = { init: sinon.stub().resolves() };
  const permissions = { init: sinon.stub().resolves() };
  const initShared = loadBootFunction('initShared', {
    './shared/url-utils': {},
    './server/services/limits': limits,
    './server/services/settings/settings-service': settings,
    './server/services/signing-keys': { default: signingKeys },
    './server/services/internal-keys': { default: internalKeys },
    './server/lib/common/events': {},
    './shared/i18n': i18n,
    './server/services/permissions': permissions,
  });
  return {
    init: (): Promise<void> => initShared({ config: { get: () => ({}) } }),
    limits,
    settings,
    signingKeys,
    internalKeys,
    i18n,
    permissions,
  };
}

type Harness = ReturnType<typeof createSharedHarness>;

// Each start in the shared layer, in order, with the one that follows it.
const order: [string, (boot: Harness) => sinon.SinonStub, (boot: Harness) => sinon.SinonStub][] = [
  // Settings reads the publicSiteAccess limit while it initializes.
  ['limits', (boot) => boot.limits.init, (boot) => boot.settings.init],
  ['settings.init', (boot) => boot.settings.init, (boot) => boot.settings.syncEmailSettings],
  // Signing keys, and i18n after them, read the settings cache.
  [
    'settings.syncEmailSettings',
    (boot) => boot.settings.syncEmailSettings,
    (boot) => boot.signingKeys.init,
  ],
  ['signing keys', (boot) => boot.signingKeys.init, (boot) => boot.internalKeys.init],
  ['internal keys', (boot) => boot.internalKeys.init, (boot) => boot.i18n.init],
  ['i18n', (boot) => boot.i18n.init, (boot) => boot.permissions.init],
];

for (const [name, current, next] of order) {
  it(`waits for ${name} before starting what follows it`, async function () {
    const boot = createSharedHarness();
    const ready = Promise.withResolvers<void>();
    current(boot).returns(ready.promise);
    let completed = false;
    const startup = boot.init().then(() => {
      completed = true;
    });

    try {
      await setImmediate();
      sinon.assert.calledOnce(current(boot));
      sinon.assert.notCalled(next(boot));
      assert.equal(completed, false);
    } finally {
      ready.resolve();
      await Promise.allSettled([startup]);
    }
    await startup;

    sinon.assert.calledOnce(next(boot));
    assert.equal(completed, true);
  });

  it(`fails with the same error when ${name} fails, and starts nothing after it`, async function () {
    const boot = createSharedHarness();
    const failure = new Error(`${name} failed`);
    current(boot).rejects(failure);

    await assert.rejects(boot.init(), (error) => error === failure);

    sinon.assert.notCalled(next(boot));
  });
}

it('waits for permissions, the last shared module, before the layer is ready', async function () {
  const boot = createSharedHarness();
  const ready = Promise.withResolvers<void>();
  boot.permissions.init.returns(ready.promise);
  let completed = false;
  const startup = boot.init().then(() => {
    completed = true;
  });

  try {
    await setImmediate();
    sinon.assert.calledOnce(boot.permissions.init);
    assert.equal(completed, false);
  } finally {
    ready.resolve();
    await startup;
  }

  assert.equal(completed, true);
});
