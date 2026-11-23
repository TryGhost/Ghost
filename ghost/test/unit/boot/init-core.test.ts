import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import { loadBootFunction } from './harness';

function createCoreHarness({ isBetterAuth = false } = {}) {
  const settings = {
    init: sinon.stub().resolves(),
    syncEmailSettings: sinon.stub().resolves(),
  };
  // Boot starts signing keys through the application. `init` stands for that start.
  const signingKeysRoot = { name: 'Signing keys' };
  const signingKeys = { init: sinon.stub().resolves() };
  const listening = [{ name: 'A listening root' }];
  const services = {
    register: sinon.stub(),
    open: sinon.stub(),
    start: sinon.spy((root: unknown) => {
      assert.equal(root, signingKeysRoot);
      return signingKeys.init();
    }),
  };
  const i18n = { init: sinon.stub().resolves() };
  // The step that follows Better Auth in initCore.
  const metafields = { init: sinon.stub() };
  const betterAuth = { start: sinon.stub().resolves() };
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
    '../bootstrap/app': { default: { services } },
    '../bootstrap/services': { listening: listening.map((root) => () => root) },
    './server/services/signing-keys': { default: signingKeysRoot },
    './server/lib/common/events': {},
    './shared/i18n': i18n,
    './server/auth': { isBetterAuth, betterAuth },
    './server/services/members-metafields': metafields,
    // Only loaded with a server, to register its shutdown.
    './server/services/jobs-service': {},
  });
  return {
    init: (ghostServer?: { registerCleanupTask: sinon.SinonStub }): Promise<void> =>
      initCore({ config: { get: () => ({}) }, ghostServer }),
    settings,
    signingKeys,
    i18n,
    betterAuth,
    metafields,
    services,
    listening,
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

it('does not start Better Auth under the legacy engine', async function () {
  const boot = createCoreHarness();

  await boot.init();

  sinon.assert.notCalled(boot.betterAuth.start);
});

it('waits for Better Auth to start under its engine, after settings and before continuing', async function () {
  const boot = createCoreHarness({ isBetterAuth: true });
  const ready = Promise.withResolvers<void>();
  boot.betterAuth.start.returns(ready.promise);
  let completed = false;
  const startup = boot.init().then(() => {
    completed = true;
  });

  try {
    await setImmediate();
    sinon.assert.calledOnce(boot.betterAuth.start);
    sinon.assert.callOrder(boot.settings.init, boot.i18n.init, boot.betterAuth.start);
    sinon.assert.notCalled(boot.metafields.init);
    assert.equal(completed, false);
  } finally {
    ready.resolve();
    await Promise.allSettled([startup]);
  }
  await startup;

  sinon.assert.calledOnce(boot.metafields.init);
  assert.equal(completed, true);
});

it('fails initCore with the error Better Auth failed to start with', async function () {
  const boot = createCoreHarness({ isBetterAuth: true });
  const failure = new Error('Better Auth setup failed');
  boot.betterAuth.start.rejects(failure);

  await assert.rejects(boot.init(), (error) => error === failure);

  sinon.assert.notCalled(boot.metafields.init);
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
    sinon.assert.notCalled(boot.metafields.init);
    assert.equal(completed, false);
  } finally {
    ready.resolve();
    await Promise.allSettled([startup]);
  }
  await startup;

  sinon.assert.calledOnce(boot.metafields.init);
  assert.equal(completed, true);
});

it('propagates the original i18n initialization error without continuing initCore', async function () {
  const boot = createCoreHarness();
  const failure = new Error('i18n initialization failed');
  boot.i18n.init.rejects(failure);

  await assert.rejects(boot.init(), (error) => error === failure);

  sinon.assert.calledOnce(boot.i18n.init);
  sinon.assert.notCalled(boot.metafields.init);
});

it('registers the listening roots, then lets services be built, once settings are loaded', async function () {
  const boot = createCoreHarness();

  await boot.init();

  assert.deepEqual(
    boot.services.register.getCalls().map((call) => call.args),
    boot.listening.map((root) => [root]),
  );
  sinon.assert.calledOnce(boot.services.open);
  sinon.assert.callOrder(
    boot.settings.init,
    boot.settings.syncEmailSettings,
    boot.services.register,
    boot.services.open,
    boot.signingKeys.init,
  );
});

it('closes the services when the server shuts down', async function () {
  const close = sinon.stub().resolves();
  const boot = createCoreHarness();
  Object.assign(boot.services, { close });
  const registerCleanupTask = sinon.stub();

  await boot.init({ registerCleanupTask });

  const registration = registerCleanupTask.getCalls().find((call) => call.args[1] === 'Services');
  assert.ok(registration);
  sinon.assert.notCalled(close);
  await registration.args[0]();
  sinon.assert.calledOnce(close);
});
