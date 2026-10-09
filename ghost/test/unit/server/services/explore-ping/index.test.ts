import assert from 'node:assert/strict';
import { setImmediate } from 'node:timers/promises';
import sinon from 'sinon';
import type {
  ExplorePingService as ExploreService,
  ExplorePingServiceDeps,
} from '../../../../../core/server/services/explore-ping/explore-ping-service';

// Use the same class and dependency objects as the CommonJS root.
const {
  ExplorePingService,
}: typeof import('../../../../../core/server/services/explore-ping/explore-ping-service') = require('../../../../../core/server/services/explore-ping/explore-ping-service');
const config = require('../../../../../core/shared/config');
const settingsCache = require('../../../../../core/shared/settings-cache');
const logging = require('@tryghost/logging');
const request = require('@tryghost/request');
const ghostVersion = require('@tryghost/version');
const members = require('../../../../../core/server/services/members');
const statsService = require('../../../../../core/server/services/stats');
const models = require('../../../../../core/server/models');
const PostStats = require('../../../../../core/server/services/posts/stats/post-stats');
const POSTS_PATH =
  require.resolve('../../../../../core/server/services/posts/posts-service-instance');
const postsFactory = require(POSTS_PATH);
const ROOT_PATH = require.resolve('../../../../../core/server/services/explore-ping');
const EXPLORE_URL = 'https://explore.example/update';

type Root = typeof import('../../../../../core/server/services/explore-ping');
type Response = Awaited<ReturnType<ExplorePingServiceDeps['request']>>;

describe('explore-ping root', function () {
  const sandbox = sinon.createSandbox();
  let originalModules: Map<string, NodeJS.Module | undefined>;
  let root: Root;
  let createPosts: sinon.SinonSpy;
  let ping: sinon.SinonSpy<[], Promise<void>>;
  let getConfig: sinon.SinonStub;
  let getSetting: sinon.SinonStub;
  let totalPosts: sinon.SinonStub;
  let totalMembers: sinon.SinonStub;
  let info: sinon.SinonStub;
  let warn: sinon.SinonStub;

  beforeEach(function () {
    originalModules = new Map([ROOT_PATH, POSTS_PATH].map((path) => [path, require.cache[path]]));
    delete require.cache[ROOT_PATH];
    createPosts = sandbox.spy(postsFactory);
    const postsModule = require.cache[POSTS_PATH];
    assert.ok(postsModule);
    require.cache[POSTS_PATH] = { ...postsModule, exports: createPosts };
    ping = sandbox.spy(ExplorePingService.prototype, 'ping');
    getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('env').returns('production');
    getConfig.withArgs('url').returns('https://publication.example/');
    getConfig.withArgs('explore:update_url').returns(EXPLORE_URL);
    getSetting = sandbox.stub(settingsCache, 'get').callThrough();
    getSetting.withArgs('explore_ping').returns(false);
    getSetting.withArgs('explore_ping_growth').returns(true);
    getSetting.withArgs('stripe_connect_livemode').returns(true);
    getSetting.withArgs('site_uuid').returns('site-uuid');
    getSetting.withArgs('active_theme').returns('source');
    getSetting.withArgs('facebook').returns(null);
    getSetting.withArgs('twitter').returns(null);
    totalPosts = sandbox.stub(PostStats.prototype, 'getTotalPostsPublished').resolves(5);
    sandbox.stub(PostStats.prototype, 'getMostRecentlyPublishedPostDate').resolves(null);
    sandbox.stub(PostStats.prototype, 'getFirstPublishedPostDate').resolves(null);
    totalMembers = sandbox.stub(members.stats, 'getTotalMembers').resolves(7);
    sandbox.stub(statsService, 'api').value(null);
    info = sandbox.stub(logging, 'info');
    warn = sandbox.stub(logging, 'warn');
    root = require(ROOT_PATH);
  });

  afterEach(async function () {
    try {
      await Promise.allSettled(ping.returnValues);
    } finally {
      sandbox.restore();
      for (const [path, original] of originalModules) {
        if (original) {
          require.cache[path] = original;
        } else {
          delete require.cache[path];
        }
      }
    }
  });

  it('uses the real configuration policy to construct fresh instances only in production and development', async function () {
    sinon.assert.notCalled(createPosts);
    sinon.assert.notCalled(ping);
    for (const env of ['testing', 'testing-mysql', 'test', 'staging']) {
      getConfig.withArgs('env').returns(env);
      assert.equal(await root.init(), undefined);
      sinon.assert.notCalled(createPosts);
      sinon.assert.notCalled(ping);
    }

    getSetting.withArgs('explore_ping').returns(false);
    for (const env of ['production', 'development']) {
      getConfig.withArgs('env').returns(env);
      assert.equal(await root.init(), undefined);
      assert.equal(await root.init(), undefined);
    }
    assert.equal(createPosts.callCount, 4);
    assert.equal(ping.callCount, 4);
    assert.equal(new Set(ping.getCalls().map((call) => call.thisValue)).size, 4);
    assert.equal(new Set(createPosts.returnValues).size, 4);
    for (let index = 0; index < 4; index += 1) {
      assert.equal(ping.getCall(index).thisValue.posts, createPosts.getCall(index).returnValue);
    }
    sinon.assert.notCalled(totalPosts);
    sinon.assert.notCalled(totalMembers);
    sinon.assert.notCalled(warn);
  });

  it('finishes init before payload and request completion, reading the shared Stats API when ready', async function () {
    getSetting.withArgs('explore_ping').returns(true);
    const posts = Promise.withResolvers<number>();
    const response = Promise.withResolvers<Response>();
    totalPosts.returns(posts.promise);
    let initialization: Promise<void> | undefined;
    try {
      let initialized = false;
      initialization = root.init().then(() => {
        initialized = true;
      });
      void initialization.catch(() => {});
      sinon.assert.calledOnce(ping);
      const service = ping.firstCall.thisValue as ExploreService;
      const completion = ping.firstCall.returnValue;
      void completion.catch(() => {});
      let completed = false;
      void completion.then(
        () => {
          completed = true;
        },
        () => {},
      );

      const wiredRequest = service.request;
      const send = sandbox.stub(service, 'request').returns(response.promise);
      assert.equal(wiredRequest, request);
      assert.equal(service.members, members);
      assert.equal(service.statsService, statsService);
      await setImmediate();
      assert.equal(initialized, true, 'Init waited for payload collection');
      assert.equal(completed, false);
      sinon.assert.notCalled(send);
      sinon.assert.notCalled(totalMembers);

      const getCurrentMrr = sandbox.stub().resolves([{ currency: 'gbp', mrr: 2500 }]);
      statsService.api = { mrr: { getCurrentMrr } };
      posts.resolve(5);
      await setImmediate();

      sinon.assert.calledOnceWithExactly(send, EXPLORE_URL, {
        method: 'POST',
        body: JSON.stringify({
          ghost: ghostVersion.full,
          site_uuid: 'site-uuid',
          url: 'https://publication.example/',
          theme: 'source',
          facebook: null,
          twitter: null,
          posts_total: 5,
          posts_last: null,
          posts_first: null,
          members_total: 7,
          mrr: [{ currency: 'gbp', mrr: 2500 }],
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      sinon.assert.calledOnce(getCurrentMrr);
      assert.equal(completed, false, 'Ping finished before its request');

      response.resolve({ statusCode: 202, statusMessage: 'Accepted' });
      assert.equal(await completion, undefined);
      sinon.assert.calledWithExactly(info, 'Explore Response', 202, 'Accepted');
      sinon.assert.notCalled(warn);
    } finally {
      // If a regression launched an extra ping, release its payload too without
      // letting that unexpected instance send a real request during cleanup.
      for (const call of ping.getCalls()) {
        const instance = call.thisValue as ExploreService;
        if (instance.request === request) {
          sandbox.stub(instance, 'request').resolves({ statusCode: 202 });
        }
      }
      posts.resolve(5);
      response.resolve({ statusCode: 202 });
      await Promise.allSettled([initialization, ...ping.returnValues]);
    }
  });

  it('logs a request rejection while the detached ping fulfills', async function () {
    getSetting.withArgs('explore_ping').returns(true);
    const initialization = root.init();
    void initialization.catch(() => {});
    sinon.assert.calledOnce(ping);
    const service = ping.firstCall.thisValue as ExploreService;
    const send = sandbox.stub(service, 'request').rejects(new Error('Explore unavailable'));

    assert.equal(await initialization, undefined);
    assert.equal(await ping.firstCall.returnValue, undefined);

    sinon.assert.calledOnce(send);
    sinon.assert.calledOnceWithExactly(warn, 'Explore Error', 'Explore unavailable');
    assert.equal(info.calledWith('Explore Response'), false);
  });

  it('rejects init with the original synchronous Posts construction error', async function () {
    const failure = new Error('Post model unavailable');
    const originalPost = Object.getOwnPropertyDescriptor(models, 'Post');
    assert.ok(originalPost);
    Object.defineProperty(models, 'Post', {
      configurable: true,
      get() {
        throw failure;
      },
    });

    try {
      await assert.rejects(root.init(), (error: unknown) => error === failure);

      sinon.assert.calledOnce(createPosts);
      sinon.assert.notCalled(ping);
      sinon.assert.notCalled(totalPosts);
      sinon.assert.notCalled(warn);
    } finally {
      Object.defineProperty(models, 'Post', originalPost);
    }
    assert.deepEqual(Object.getOwnPropertyDescriptor(models, 'Post'), originalPost);
  });

  it('resolves init while an unexpected payload error rejects its detached ping', async function () {
    getSetting.withArgs('explore_ping').returns(true);
    const failure = new Error('Site metadata unavailable');
    getSetting.withArgs('site_uuid').throws(failure);

    const initialization = root.init();
    // The root does not observe this promise. Attach immediately so the test
    // checks its rejection without leaking an unhandled rejection to the suite.
    const rejection = assert.rejects(
      ping.firstCall.returnValue,
      (error: unknown) => error === failure,
    );

    assert.equal(await initialization, undefined);
    await rejection;
    sinon.assert.calledOnce(ping);
    sinon.assert.notCalled(totalPosts);
    sinon.assert.notCalled(warn);
  });
});
