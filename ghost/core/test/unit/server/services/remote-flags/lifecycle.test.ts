import assert from 'node:assert/strict';
import sinon from 'sinon';

const logging = require('@tryghost/logging');
const sentry = require('../../../../../core/shared/sentry');
const settingsCache = require('../../../../../core/shared/settings-cache');
const flagOverrides = require('../../../../../core/shared/labs-flag-overrides');
const {
  RemoteFlagsService,
} = require('../../../../../core/server/services/remote-flags/remote-flags-service');
const rootPath = require.resolve('../../../../../core/server/services/remote-flags');
const requestPath = require.resolve('@tryghost/request');

type Response = { statusCode: number; body?: string };

describe('remote-flags root lifecycle', function () {
  const sandbox = sinon.createSandbox();
  let remoteFlags: typeof import('../../../../../core/server/services/remote-flags');
  let previousModule: NodeModule | undefined;
  let previousOverrides: Record<string, boolean>;
  let request: sinon.SinonStub;
  let start: sinon.SinonSpy;
  let clock: sinon.SinonFakeTimers;
  let pendingRequests: Array<(response: Response) => void>;

  beforeEach(function () {
    previousModule = require.cache[rootPath];
    previousOverrides = flagOverrides.getAll();
    pendingRequests = [];
    request = sandbox.stub().resolves({ statusCode: 304 });
    start = sandbox.spy(RemoteFlagsService.prototype, 'start');
    clock = sandbox.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    sandbox.stub(logging, 'info');
    sandbox.stub(logging, 'warn');
    sandbox.stub(sentry);
    sandbox.stub(settingsCache, 'get').withArgs('site_uuid').returns('site-a');

    // Only the external request function is replaced. Load a fresh root for
    // this independent case, then retain it throughout every init/stop cycle.
    // Restore the shared request module immediately after this synchronous import.
    const originalRequest = require(requestPath);
    const requestModule = require.cache[requestPath]!;
    try {
      requestModule.exports = request;
      delete require.cache[rootPath];
      remoteFlags = require(rootPath);
    } finally {
      requestModule.exports = originalRequest;
    }
  });

  afterEach(async function () {
    try {
      remoteFlags.stop();
      for (const settle of pendingRequests) {
        settle({ statusCode: 304 });
      }
      // An assertion failure must not leave a pending initial fetch whose
      // continuation can write to the shared override store in a later test.
      await Promise.allSettled(start.getCalls().map((call) => call.returnValue));
    } finally {
      flagOverrides.replace(previousOverrides);
      sandbox.restore();
      delete require.cache[rootPath];
      if (previousModule) {
        require.cache[rootPath] = previousModule;
      }
    }
  });

  it('returns the running instance before the initial fetch settles', async function () {
    let finishRequest!: (response: Response) => void;
    request.returns(
      new Promise<Response>((resolve) => {
        finishRequest = resolve;
        pendingRequests.push(resolve);
      }),
    );
    flagOverrides.replace({ previousFlag: true });
    const config = {
      get: sinon.stub().withArgs('remoteFlags').returns({
        enabled: true,
        url: 'https://example.com/flags.json',
      }),
    };

    const instance = remoteFlags.init(config);

    assert.ok(instance instanceof RemoteFlagsService);
    assert.equal(remoteFlags.getInstance(), instance);
    assert.equal(remoteFlags.init(config), instance);
    sinon.assert.calledOnce(start);
    sinon.assert.calledOnce(request);
    assert.equal(request.firstCall.args[0], 'https://example.com/flags.json');
    assert.deepEqual(flagOverrides.getAll(), { previousFlag: true });

    finishRequest({ statusCode: 200, body: JSON.stringify({ fetchedFlag: true }) });
    await start.firstCall.returnValue;
    assert.deepEqual(flagOverrides.getAll(), { fetchedFlag: true });
    assert.equal(clock.countTimers(), 1);
    remoteFlags.stop();
    assert.equal(clock.countTimers(), 0);
  });

  it('captures config while running and reads new config after stop without reloading the root', async function () {
    let configured = { enabled: false, url: 'https://example.com/a.json', pollInterval: 60000 };
    const config = {
      get: sinon
        .stub()
        .withArgs('remoteFlags')
        .callsFake(() => configured),
    };
    request.onFirstCall().resolves({ statusCode: 200, body: JSON.stringify({ flagA: true }) });
    request.onSecondCall().resolves({ statusCode: 200, body: JSON.stringify({ flagB: true }) });

    assert.equal(remoteFlags.init(config), null);
    sinon.assert.notCalled(request);

    configured = { ...configured, enabled: true };
    const first = remoteFlags.init(config)!;
    await start.firstCall.returnValue;
    assert.deepEqual(flagOverrides.getAll(), { flagA: true });

    configured = { ...configured, enabled: false };
    assert.equal(remoteFlags.init(config), first);

    configured = { enabled: true, url: 'https://example.com/b.json', pollInterval: 120000 };
    settingsCache.get.withArgs('site_uuid').returns('site-b');
    assert.equal(remoteFlags.init(config), first);
    assert.equal(first.url.href, 'https://example.com/a.json');
    assert.equal(first.pollInterval, 60000);
    assert.equal(first.siteUuid, 'site-a');
    sinon.assert.calledOnce(request);

    remoteFlags.stop();
    assert.equal(remoteFlags.getInstance(), null);
    assert.deepEqual(flagOverrides.getAll(), { flagA: true });
    assert.equal(clock.countTimers(), 0);

    const second = remoteFlags.init(config)!;
    await start.secondCall.returnValue;
    assert.notEqual(second, first);
    assert.equal(second.url.href, 'https://example.com/b.json');
    assert.equal(second.pollInterval, 120000);
    assert.equal(second.siteUuid, 'site-b');
    assert.equal(request.secondCall.args[0], 'https://example.com/b.json');
    assert.deepEqual(flagOverrides.getAll(), { flagB: true });
    assert.equal(clock.countTimers(), 1);

    remoteFlags.stop();
    configured = { ...configured, enabled: false };
    assert.equal(remoteFlags.init(config), null);
    assert.equal(remoteFlags.getInstance(), null);
    assert.deepEqual(flagOverrides.getAll(), { flagB: true });
    assert.equal(clock.countTimers(), 0);
    sinon.assert.calledTwice(start);
    sinon.assert.calledTwice(request);
  });
});
