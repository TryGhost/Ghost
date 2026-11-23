import assert from 'node:assert/strict';
import type { EventEmitter } from 'node:events';
import sinon from 'sinon';
import nock from 'nock';
import type { IndexNowPingServiceDeps } from '../../../../../core/server/services/indexnow-ping/indexnow-ping-service';

const events: EventEmitter = require('../../../../../core/server/lib/common/events');
const config: IndexNowPingServiceDeps['config'] = require('../../../../../core/shared/config');
const settingsCache: IndexNowPingServiceDeps['settingsCache'] = require('../../../../../core/shared/settings-cache');
const urlService: IndexNowPingServiceDeps['urlService'] = require('../../../../../core/server/services/url');
const logging: IndexNowPingServiceDeps['logging'] = require('@tryghost/logging');

const root: typeof import('../../../../../core/server/services/indexnow-ping').default =
  require('../../../../../core/server/services/indexnow-ping').default;
const {
  IndexNowPingService,
}: typeof import('../../../../../core/server/services/indexnow-ping/indexnow-ping-service') = require('../../../../../core/server/services/indexnow-ping/indexnow-ping-service');
const {
  openServices,
  services,
}: typeof import('../../../../utils/services') = require('../../../../utils/services');
const {
  listening,
}: typeof import('../../../../../bootstrap/services') = require('../../../../../bootstrap/services');

// Opening the services registers every root that declares listeners, and other roots listen for
// the post events too. They are made inert, so that only this root reacts to an event.
function silenceOtherRoots(sandbox: sinon.SinonSandbox) {
  for (const named of listening) {
    const other = named();
    if (other !== root) {
      sandbox.stub(other, 'create').returns({});
      for (const listener of other.listeners) {
        sandbox.stub(listener, 'handle');
      }
    }
  }
}

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
    // The root's dependencies and the shared event bus are real.
    originalListeners = new Map(EVENT_NAMES.map((name) => [name, events.listeners(name)]));
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
    silenceOtherRoots(sandbox);
    openServices();
  });

  afterEach(function () {
    for (const [name, listeners] of originalListeners) {
      for (const listener of events.listeners(name)) {
        if (!listeners.includes(listener)) {
          events.removeListener(name, listener as (...args: unknown[]) => void);
        }
      }
    }
    sandbox.restore();
    nock.cleanAll();
  });

  it('builds one service that handles each post event once', async function () {
    const service = root.service;
    assert.ok(service instanceof IndexNowPingService);
    assert.equal(root.service, service);

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

  it('stops handling events when services close, and an event after they reopen builds a new instance', async function () {
    const unrelated = () => {};
    for (const name of EVENT_NAMES) {
      events.on(name, unrelated);
    }
    const service = root.service;
    const ping = sandbox.stub(IndexNowPingService.prototype, 'ping').resolves();

    await services.close();
    for (const name of EVENT_NAMES) {
      assert.deepEqual(
        events
          .listeners(name)
          .filter((listener) => !originalListeners.get(name)!.includes(listener)),
        [unrelated],
      );
    }
    events.emit('post.published', postModel());
    sinon.assert.notCalled(ping);

    // Nothing reads the service before the events arrive: the first one builds it.
    openServices();
    events.emit('post.published', postModel());
    events.emit('post.published.edited', postModel());
    sinon.assert.calledTwice(ping);
    const rebuilt = root.service;
    assert.notEqual(rebuilt, service);
    sinon.assert.alwaysCalledOn(ping, rebuilt);
    await Promise.all(ping.returnValues);
  });

  it('keeps handling events with one instance while environment, privacy and site visibility change', async function () {
    privacyDisabled.returns(true);
    const service = root.service;
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
    assert.equal(root.service, service);
    assert.equal(ping.callCount, 5);
  });

  it('uses the current key and complete encoded URLs through the wired request helper', async function () {
    const service = root.service;
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
    assert.equal(root.service, service);
  });

  it('starts a request during event delivery and logs a later transport failure', async function () {
    const service = root.service;
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
    const service = root.service;
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
