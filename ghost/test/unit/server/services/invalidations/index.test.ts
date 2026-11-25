import assert from 'node:assert/strict';
import sinon from 'sinon';
import { IncorrectUsageError } from '@tryghost/errors';
import type serviceRoot from '../../../../../core/server/services/invalidations';

// Match the root's CommonJS loading path so instanceof uses the same constructor.
const { InvalidationsService } =
  require('../../../../../core/server/services/invalidations/invalidations-service') as typeof import('../../../../../core/server/services/invalidations/invalidations-service');
const { RedisTransport, channelFor } =
  require('../../../../../core/server/services/invalidations/redis-transport') as typeof import('../../../../../core/server/services/invalidations/redis-transport');
const { LocalTransport } =
  require('../../../../../core/server/services/invalidations/transport') as typeof import('../../../../../core/server/services/invalidations/transport');
const config = require('../../../../../core/shared/config');
const ROOT_PATH = require.resolve('../../../../../core/server/services/invalidations');

describe('InvalidationsService root', function () {
  let originalModule: NodeJS.Module | undefined;
  let root: typeof serviceRoot;
  const sandbox = sinon.createSandbox();

  beforeEach(function () {
    // Reload only the root and restore its cache entry for other tests' consumers.
    originalModule = require.cache[ROOT_PATH];
    delete require.cache[ROOT_PATH];
    root = require(ROOT_PATH).default as typeof serviceRoot;
  });

  afterEach(function () {
    sandbox.restore();
    if (originalModule) {
      require.cache[ROOT_PATH] = originalModule;
    } else {
      delete require.cache[ROOT_PATH];
    }
  });

  it('requires initialization and retains one wired instance', async function () {
    assert.throws(() => root.service, IncorrectUsageError);

    await Promise.all([root.init(), root.init()]);
    const service = root.service;
    assert.ok(service instanceof InvalidationsService);

    await root.init();
    assert.equal(root.service, service);
  });

  it('has no peers without configuration, so notifying them does nothing', async function () {
    const local = sandbox.spy(LocalTransport.prototype, 'publish');
    const redis = sandbox.spy(RedisTransport.prototype, 'subscribe');
    await root.init();
    const callback = sinon.stub();

    assert.equal(root.service.isReady(), true);
    await root.service.register('tiers', callback).notifyPeers();

    sinon.assert.calledOnce(local);
    sinon.assert.notCalled(redis);
    sinon.assert.notCalled(callback);
    assert.equal(root.service.isReady(), true);
  });

  it('starts again after stopping', async function () {
    await root.init();
    const service = root.service;

    await root.stop();
    await root.init();

    assert.equal(root.service, service);
    assert.equal(root.service.isReady(), true);
  });

  describe('with Redis', function () {
    let getConfig: sinon.SinonStub;
    let subscribe: sinon.SinonStub;

    beforeEach(function () {
      // Wiring only: the two-instance integration test covers connecting
      subscribe = sandbox.stub(RedisTransport.prototype, 'subscribe').resolves();
      sandbox.stub(RedisTransport.prototype, 'close').resolves();
      getConfig = sandbox.stub(config, 'get').callThrough();
      getConfig.withArgs('url').returns('https://Example.com/blog/');
      getConfig.withArgs('env').returns('production');
    });

    it('uses one channel per site and environment', async function () {
      getConfig
        .withArgs('invalidations')
        .returns({ transport: 'redis', redis: { host: '127.0.0.1', port: 6379 } });

      await root.init();

      sinon.assert.calledOnce(subscribe);
      assert.equal(
        subscribe.firstCall.thisValue.channel,
        'ghost:invalidations:production:example.com:blog',
      );
      await root.stop();
    });

    it('uses a configured channel instead', async function () {
      getConfig
        .withArgs('invalidations')
        .returns({ transport: 'redis', channel: 'shared', redis: { host: '127.0.0.1' } });

      await root.init();

      assert.equal(subscribe.firstCall.thisValue.channel, 'shared');
      await root.stop();
    });
  });

  describe('channelFor', function () {
    it('names the channel after the environment, host and path', function () {
      assert.equal(
        channelFor({ url: 'https://Example.com/blog/', env: 'production' }),
        'ghost:invalidations:production:example.com:blog',
      );
      assert.equal(
        channelFor({ url: 'http://localhost:2368/', env: 'development' }),
        'ghost:invalidations:development:localhost:2368',
      );
    });
  });
});
