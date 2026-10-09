import assert from 'node:assert/strict';
import type { EventEmitter } from 'node:events';
import sinon from 'sinon';
import nock from 'nock';
import type indexNowRoot from '../../../../../core/server/services/indexnow-ping';
import type { IndexNowPingServiceDeps } from '../../../../../core/server/services/indexnow-ping/indexnow-ping-service';

const events: EventEmitter = require('../../../../../core/server/lib/common/events');
const config: IndexNowPingServiceDeps['config'] = require('../../../../../core/shared/config');
const settingsCache: IndexNowPingServiceDeps['settingsCache'] = require('../../../../../core/shared/settings-cache');
const urlService: IndexNowPingServiceDeps['urlService'] = require('../../../../../core/server/services/url');
const logging: IndexNowPingServiceDeps['logging'] = require('@tryghost/logging');

const { IncorrectUsageError } = require('@tryghost/errors');

const ROOT_PATH = require.resolve('../../../../../core/server/services/indexnow-ping');
const EVENT_NAMES = ['post.published', 'post.published.edited'];
const KEY = '0123456789abcdef0123456789abcdef';

function postModel() {
  return {
    get: (field: string) => (field === 'title' ? 'New title' : undefined),
    previous: (field: string) => (field === 'title' ? 'Old title' : undefined),
    toJSON: () => ({ id: 'post-id', slug: 'a-post', type: 'post' }),
    related: (relation: string) => ({
      toJSON: () => [{ slug: relation === 'authors' ? 'author' : 'tag' }],
    }),
  };
}

describe('IndexNow service root', function () {
  let originalModule: NodeJS.Module | undefined;
  let root: typeof indexNowRoot | undefined;
  let sandbox: sinon.SinonSandbox;
  let getConfig: sinon.SinonStub<[string], unknown>;
  let getSetting: sinon.SinonStub<[string], unknown>;
  let privacyDisabled: sinon.SinonStub<[string], boolean>;
  let resolveUrl: sinon.SinonStubbedFunction<
    IndexNowPingServiceDeps['urlService']['getUrlForResource']
  >;
  let loggedInfo: sinon.SinonStub<unknown[], void>;
  let loggedWarning: sinon.SinonStub<unknown[], void>;
  let originalListeners: Map<string, ReturnType<EventEmitter['listeners']>>;

  beforeEach(function () {
    // Only cold-load the root. Its dependencies and the shared event bus are real;
    // restore the original cache entry so retained consumers keep their module.
    originalModule = require.cache[ROOT_PATH];
    originalListeners = new Map(EVENT_NAMES.map((name) => [name, events.listeners(name)]));
    delete require.cache[ROOT_PATH];
    sandbox = sinon.createSandbox();
    getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('env').returns('production');
    getConfig.withArgs('url').returns('https://example.com/news/');
    getSetting = sandbox.stub(settingsCache, 'get').callThrough();
    getSetting.withArgs('is_private').returns(false);
    getSetting.withArgs('indexnow_api_key').returns(KEY);
    privacyDisabled = sandbox
      .stub(config, 'isPrivacyDisabled')
      .callThrough()
      .withArgs('useIndexNow')
      .returns(false);
    resolveUrl = sandbox
      .stub(urlService, 'getUrlForResource')
      .returns('https://example.com/news/a-post/');
    loggedInfo = sandbox.stub(logging, 'info');
    loggedWarning = sandbox.stub(logging, 'warn');
  });

  afterEach(function () {
    for (const [name, listeners] of originalListeners) {
      for (const listener of events.listeners(name)) {
        if (!listeners.includes(listener)) {
          events.removeListener(name, listener as (...args: unknown[]) => void);
        }
      }
    }
    root = undefined;
    sandbox.restore();
    nock.cleanAll();
    if (originalModule) {
      require.cache[ROOT_PATH] = originalModule;
    } else {
      delete require.cache[ROOT_PATH];
    }
  });

  it('subscribes only at init and delivers each event once after repeated init', async function () {
    const subscribe = sandbox.spy(events, 'on');
    root = require(ROOT_PATH).default as typeof indexNowRoot;
    assert.throws(() => root!.getInstance(), IncorrectUsageError);
    sinon.assert.notCalled(subscribe);

    await root.init();
    const service = root.getInstance();
    assert.ok(service);
    await root.init();
    assert.equal(root.getInstance(), service);
    for (const name of EVENT_NAMES) {
      assert.equal(
        events.listeners(name).filter((listener) => listener === service.listener).length,
        1,
      );
    }

    const ping = sandbox.stub(service, 'ping').resolves();
    const model = postModel();
    events.emit('post.published', model);
    events.emit('post.published.edited', model);
    sinon.assert.calledTwice(ping);
    sinon.assert.alwaysCalledWithExactly(ping, {
      id: 'post-id',
      slug: 'a-post',
      type: 'post',
      authors: [{ slug: 'author' }],
      tags: [{ slug: 'tag' }],
    });

    events.emit('post.published', model, { importing: true });
    events.emit('post.published.edited', { ...model, previous: model.get });
    sinon.assert.calledTwice(ping);
    await Promise.all(ping.returnValues);
  });

  it('removes a partial subscription after failure and retries without disturbing other listeners', async function () {
    const unrelated = () => {};
    for (const name of EVENT_NAMES) {
      events.on(name, unrelated);
    }
    const listenersBeforeInit = new Map(EVENT_NAMES.map((name) => [name, events.listeners(name)]));
    const failure = new Error('Cannot subscribe to post edits');
    const on = events.on;
    const subscribe = sandbox.stub(events, 'on').callsFake(function (name, listener) {
      on.call(events, name, listener);
      if (name === 'post.published.edited') {
        throw failure;
      }
      return events;
    });
    root = require(ROOT_PATH).default as typeof indexNowRoot;

    await assert.rejects(root.init(), (error) => error === failure);
    assert.throws(() => root!.getInstance(), IncorrectUsageError);
    for (const [name, listeners] of listenersBeforeInit) {
      assert.deepEqual(events.listeners(name), listeners);
    }

    subscribe.restore();
    await root.init();
    const service = root.getInstance();
    for (const [name, listeners] of listenersBeforeInit) {
      assert.deepEqual(events.listeners(name), [...listeners, service.listener]);
    }
    const ping = sandbox.stub(service, 'ping').resolves();
    events.emit('post.published', postModel());
    events.emit('post.published.edited', postModel());
    sinon.assert.calledTwice(ping);
    await Promise.all(ping.returnValues);
  });

  it('keeps the initialized listener while environment, privacy and site visibility change', async function () {
    privacyDisabled.returns(true);
    root = require(ROOT_PATH).default as typeof indexNowRoot;
    await root.init();
    const service = root.getInstance();
    assert.ok(service);
    const request = sandbox.stub(service, 'request').resolves({ statusCode: 200 });
    const ping = sandbox.spy(service, 'ping');
    const emit = async () => {
      events.emit('post.published', postModel());
      await ping.lastCall.returnValue;
    };

    await emit();
    sinon.assert.notCalled(request);
    privacyDisabled.returns(false);
    await emit();
    sinon.assert.calledOnce(request);

    getConfig.withArgs('env').returns('development');
    await emit();
    sinon.assert.calledOnce(request);
    getConfig.withArgs('env').returns('production');
    getSetting.withArgs('is_private').returns(true);
    await emit();
    sinon.assert.calledOnce(request);
    getSetting.withArgs('is_private').returns(false);
    await emit();
    sinon.assert.calledTwice(request);
    assert.equal(root.getInstance(), service);
    assert.equal(ping.callCount, 5);
  });

  it('uses the current key and complete encoded URLs through the wired request helper', async function () {
    root = require(ROOT_PATH).default as typeof indexNowRoot;
    await root.init();
    const service = root.getInstance();
    assert.ok(service);
    const ping = sandbox.spy(service, 'ping');
    const firstUrl = 'https://example.com/news/a-post/?tag=hello world&x=1';
    resolveUrl.returns(firstUrl);
    const first = nock('https://api.indexnow.org')
      .get('/indexnow')
      .query({
        url: firstUrl,
        key: KEY,
        keyLocation: `https://example.com/news/${KEY}.txt`,
      })
      .reply(200);
    events.emit('post.published', postModel());
    await ping.lastCall.returnValue;
    first.done();

    const nextKey = 'fedcba9876543210fedcba9876543210';
    const nextUrl = 'https://other.example/blog/changed/';
    getSetting.withArgs('indexnow_api_key').returns(nextKey);
    getConfig.withArgs('url').returns('https://other.example/blog/');
    resolveUrl.returns(nextUrl);
    const second = nock('https://api.indexnow.org')
      .get('/indexnow')
      .query({
        url: nextUrl,
        key: nextKey,
        keyLocation: `https://other.example/blog/${nextKey}.txt`,
      })
      .reply(202);
    events.emit('post.published.edited', postModel());
    await ping.lastCall.returnValue;
    second.done();
    sinon.assert.calledTwice(loggedInfo);
    sinon.assert.notCalled(loggedWarning);
    sinon.assert.alwaysCalledWithExactly(
      resolveUrl,
      {
        id: 'post-id',
        slug: 'a-post',
        type: 'posts',
        authors: [{ slug: 'author' }],
        tags: [{ slug: 'tag' }],
      },
      { absolute: true },
    );
    assert.equal(root.getInstance(), service);
  });

  it('starts a request during event delivery and logs a later transport failure', async function () {
    root = require(ROOT_PATH).default as typeof indexNowRoot;
    await root.init();
    const service = root.getInstance();
    assert.ok(service);
    const { promise, reject } = Promise.withResolvers<{ statusCode: number }>();
    const request = sandbox.stub(service, 'request').returns(promise);
    const ping = sandbox.spy(service, 'ping');
    events.emit('post.published', postModel());
    sinon.assert.calledOnce(request);
    sinon.assert.calledWithExactly(request, sinon.match.string, { timeout: { request: 5000 } });
    sinon.assert.notCalled(loggedInfo);
    sinon.assert.notCalled(loggedWarning);

    // The emitter has returned with the request unresolved. A transport error
    // resolves ping after logging; it does not escape the event callback.
    reject(new Error('IndexNow unavailable'));
    await ping.lastCall.returnValue;
    sinon.assert.calledOnceWithMatch(loggedWarning, { event: { name: 'indexnow.ping_failed' } });
    sinon.assert.notCalled(loggedInfo);
  });

  it('lets synchronous model errors escape, but swallows pre-request promise rejections', async function () {
    root = require(ROOT_PATH).default as typeof indexNowRoot;
    await root.init();
    const service = root.getInstance();
    assert.ok(service);
    const error = new Error('Cannot read model');
    assert.throws(
      () =>
        events.emit('post.published', {
          ...postModel(),
          toJSON: () => {
            throw error;
          },
        }),
      (thrown) => thrown === error,
    );

    const request = sandbox.stub(service, 'request').resolves({ statusCode: 200 });
    getConfig.withArgs('env').throws(error);
    const ping = sandbox.spy(service, 'ping');
    assert.doesNotThrow(() => events.emit('post.published', postModel()));
    sinon.assert.calledOnce(ping);
    // Let rejection handlers run without attaching one in the test: Vitest
    // reports an unhandled rejection if the listener loses its catch.
    await new Promise<void>((resolve) => {
      setImmediate(resolve);
    });
    sinon.assert.notCalled(request);
    sinon.assert.notCalled(loggedWarning);
  });
});
