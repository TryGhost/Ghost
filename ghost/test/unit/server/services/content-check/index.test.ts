import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import type { EventEmitter } from 'node:events';
import sinon from 'sinon';
import type contentCheckRoot from '../../../../../core/server/services/content-check';
import type { ContentCheckServiceDeps } from '../../../../../core/server/services/content-check/content-check-service';

const events: EventEmitter = require('../../../../../core/server/lib/common/events');
const config: ContentCheckServiceDeps['config'] = require('../../../../../core/shared/config');
const logging: ContentCheckServiceDeps['logging'] = require('@tryghost/logging');
const urlUtils: ContentCheckServiceDeps['urlUtils'] =
  require('../../../../../core/shared/url-utils').default;

const { IncorrectUsageError } = require('@tryghost/errors');

const ROOT_PATH = require.resolve('../../../../../core/server/services/content-check');
const EVENT_NAME = 'settings.title.edited';
const WEBHOOK_ORIGIN = 'https://content-check.example';
const WEBHOOK_URL = `${WEBHOOK_ORIGIN}/v1/ghost/events`;
const WEBHOOK_SECRET = 'not-a-live-secret';
const SITE_ID = '123456';
const SITE_URL = 'https://example.ghost.io/';
const SITE_CREATED_AT = '2026-10-15T10:00:00.000Z';
const FROZEN_NOW = '2026-11-01T12:00:00.000Z';
const MAX_SITE_AGE_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;
const SAMPLE_TITLE = 'Acme Weekly';

function titleModel(value: unknown) {
  return {
    get: (field: string) => (field === 'value' ? value : undefined),
  };
}

describe('Content Check service root', function () {
  let originalModule: NodeJS.Module | undefined;
  let root: typeof contentCheckRoot | undefined;
  let sandbox: sinon.SinonSandbox;
  let clock: sinon.SinonFakeTimers;
  let getConfig: sinon.SinonStub<[string], unknown>;
  let getSiteUrl: sinon.SinonStub<[], string>;
  let loggedInfo: sinon.SinonStub<unknown[], void>;
  let loggedWarning: sinon.SinonStub<unknown[], void>;
  let loggedError: sinon.SinonStub<unknown[], void>;
  let originalListeners: ReturnType<EventEmitter['listeners']>;

  beforeEach(function () {
    originalModule = require.cache[ROOT_PATH];
    originalListeners = events.listeners(EVENT_NAME);
    delete require.cache[ROOT_PATH];
    sandbox = sinon.createSandbox();
    clock = sandbox.useFakeTimers({
      now: new Date(FROZEN_NOW).getTime(),
      toFake: ['Date'],
    });

    getConfig = sandbox.stub(config, 'get').callThrough();
    getConfig.withArgs('hostSettings:contentCheck:webhookUrl').returns(WEBHOOK_URL);
    getConfig.withArgs('hostSettings:contentCheck:webhookSecret').returns(WEBHOOK_SECRET);
    getConfig.withArgs('hostSettings:contentCheck:siteCreatedAt').returns(SITE_CREATED_AT);
    getConfig.withArgs('hostSettings:contentCheck:maxSiteAgeDays').returns(MAX_SITE_AGE_DAYS);
    getConfig.withArgs('hostSettings:siteId').returns(SITE_ID);

    getSiteUrl = sandbox.stub(urlUtils, 'getSiteUrl').returns(SITE_URL);
    loggedInfo = sandbox.stub(logging, 'info');
    loggedWarning = sandbox.stub(logging, 'warn');
    loggedError = sandbox.stub(logging, 'error');
  });

  afterEach(async function () {
    if (root) {
      await root.stop();
    }
    for (const listener of events.listeners(EVENT_NAME)) {
      if (!originalListeners.includes(listener)) {
        events.removeListener(EVENT_NAME, listener as (...args: unknown[]) => void);
      }
    }
    root = undefined;
    sandbox.restore();
    if (originalModule) {
      require.cache[ROOT_PATH] = originalModule;
    } else {
      delete require.cache[ROOT_PATH];
    }
  });

  async function initRoot() {
    root = require(ROOT_PATH).default as typeof contentCheckRoot;
    await root.init();
    return root.service!;
  }

  async function emitTitle(send: sinon.SinonSpy | sinon.SinonStub, title: unknown = SAMPLE_TITLE) {
    events.emit(EVENT_NAME, titleModel(title));
    await send.lastCall.returnValue;
  }

  it('subscribes only at init and delivers once after repeated init', async function () {
    const subscribe = sandbox.spy(events, 'on');
    root = require(ROOT_PATH).default as typeof contentCheckRoot;
    assert.throws(() => root!.service, IncorrectUsageError);
    sinon.assert.notCalled(subscribe);

    await root.init();
    const service = root.service;
    assert.ok(service);
    await root.init();
    assert.equal(root.service, service);
    assert.equal(
      events.listeners(EVENT_NAME).filter((listener) => listener === service.listener).length,
      1,
    );

    const send = sandbox.stub(service, 'sendTitleChanged').resolves();
    const model = titleModel(SAMPLE_TITLE);
    events.emit(EVENT_NAME, model);
    events.emit(EVENT_NAME, model, { importing: true });
    sinon.assert.calledOnceWithExactly(send, model);
  });

  it('removes a failed partial subscription and retries cleanly', async function () {
    const unrelated = () => {};
    events.on(EVENT_NAME, unrelated);
    const listenersBeforeInit = events.listeners(EVENT_NAME);
    const failure = new Error('Cannot subscribe to title edits');
    const on = events.on;
    const subscribe = sandbox.stub(events, 'on').callsFake(function (name, listener) {
      on.call(events, name, listener);
      if (name === EVENT_NAME) {
        throw failure;
      }
      return events;
    });
    root = require(ROOT_PATH).default as typeof contentCheckRoot;

    await assert.rejects(root.init(), (error) => error === failure);
    assert.throws(() => root!.service, IncorrectUsageError);
    assert.deepEqual(events.listeners(EVENT_NAME), listenersBeforeInit);

    subscribe.restore();
    await root.init();
    const service = root.service;
    assert.ok(service);
    assert.deepEqual(events.listeners(EVENT_NAME), [...listenersBeforeInit, service.listener]);
  });

  it('stops listening on stop and delivers once after the next init', async function () {
    const unrelated = () => {};
    events.on(EVENT_NAME, unrelated);
    const listenersBeforeInit = events.listeners(EVENT_NAME);
    const service = await initRoot();
    const send = sandbox.stub(service, 'sendTitleChanged').resolves();

    await root!.stop();
    assert.deepEqual(events.listeners(EVENT_NAME), listenersBeforeInit);
    events.emit(EVENT_NAME, titleModel(SAMPLE_TITLE));
    sinon.assert.notCalled(send);
    assert.equal(root!.service, service);

    await root!.init();
    assert.equal(root!.service, service);
    assert.deepEqual(events.listeners(EVENT_NAME), [...listenersBeforeInit, service.listener]);
    events.emit(EVENT_NAME, titleModel(SAMPLE_TITLE));
    sinon.assert.calledOnce(send);
  });

  it('POSTs a signed site.title_changed payload through the wired request helper', async function () {
    const service = await initRoot();
    const request = sandbox.stub(service, 'request').resolves(null);
    const send = sandbox.spy(service, 'sendTitleChanged');

    await emitTitle(send);

    sinon.assert.calledOnce(request);
    const [requestUrl, requestOptions] = request.firstCall.args as [
      string,
      {
        method: string;
        body: string;
        headers: Record<string, string>;
        retry: { limit: number; methods: string[] };
      },
    ];
    assert.equal(requestUrl, WEBHOOK_URL);
    assert.equal(requestOptions.method, 'POST');
    assert.deepEqual(JSON.parse(requestOptions.body), {
      type: 'site.title_changed',
      siteId: SITE_ID,
      siteUrl: SITE_URL,
      siteCreatedAt: SITE_CREATED_AT,
      title: SAMPLE_TITLE,
    });

    const timestamp = requestOptions.headers['X-Ghost-Request-Timestamp'];
    const expectedSignature = crypto
      .createHmac('sha256', WEBHOOK_SECRET)
      .update(`${timestamp}:${requestOptions.body}`)
      .digest('base64');
    assert.equal(requestOptions.headers['X-Ghost-Signature'], expectedSignature);
    assert.deepEqual(requestOptions.retry, { limit: 2, methods: ['POST'] });
    sinon.assert.calledOnceWithExactly(
      loggedInfo,
      `Triggering content check webhook to "${WEBHOOK_ORIGIN}"`,
    );
    sinon.assert.calledOnce(getSiteUrl);
  });

  it('does not request when config is incomplete', async function () {
    getConfig.withArgs('hostSettings:contentCheck:webhookUrl').returns('');
    const service = await initRoot();
    const request = sandbox.stub(service, 'request').resolves(null);
    const send = sandbox.spy(service, 'sendTitleChanged');

    await emitTitle(send);
    sinon.assert.notCalled(request);
    sinon.assert.notCalled(loggedWarning);

    getConfig.withArgs('hostSettings:contentCheck:webhookUrl').returns(WEBHOOK_URL);
    getConfig.withArgs('hostSettings:contentCheck:webhookSecret').returns('');
    await emitTitle(send);
    sinon.assert.notCalled(request);
    sinon.assert.calledOnce(loggedWarning);

    getConfig.withArgs('hostSettings:contentCheck:webhookSecret').returns(WEBHOOK_SECRET);
    getConfig.withArgs('hostSettings:contentCheck:maxSiteAgeDays').returns(undefined);
    await emitTitle(send);
    sinon.assert.notCalled(request);
    sinon.assert.calledTwice(loggedWarning);
  });

  it('skips empty, null, and whitespace-only titles', async function () {
    const service = await initRoot();
    const request = sandbox.stub(service, 'request').resolves(null);

    for (const value of ['', '   ', null, undefined]) {
      await service.sendTitleChanged(titleModel(value));
      sinon.assert.notCalled(request);
    }
    sinon.assert.notCalled(loggedInfo);
  });

  it('sends below the age cutoff and skips at or above it without restart', async function () {
    getConfig.withArgs('hostSettings:contentCheck:maxSiteAgeDays').returns(10);
    getConfig
      .withArgs('hostSettings:contentCheck:siteCreatedAt')
      .returns(new Date(Date.now() - 9 * DAY_MS).toISOString());
    const service = await initRoot();
    const request = sandbox.stub(service, 'request').resolves(null);
    const send = sandbox.spy(service, 'sendTitleChanged');

    await emitTitle(send);
    sinon.assert.calledOnce(request);

    clock.tick(DAY_MS);
    await emitTitle(send);
    sinon.assert.calledOnce(request);
  });

  it('swallows synchronous preparation failures inside the async send path', async function () {
    const service = await initRoot();
    const error = new Error('Cannot read title');
    const request = sandbox.stub(service, 'request').resolves(null);
    const send = sandbox.spy(service, 'sendTitleChanged');

    assert.doesNotThrow(() =>
      events.emit(EVENT_NAME, {
        get: () => {
          throw error;
        },
      }),
    );
    sinon.assert.calledOnce(send);
    await send.lastCall.returnValue;
    sinon.assert.notCalled(request);
    sinon.assert.calledOnceWithExactly(loggedError, error);
  });

  it('returns from the event handler while the request is still unresolved', async function () {
    const service = await initRoot();
    const { promise, reject } = Promise.withResolvers<unknown>();
    const request = sandbox.stub(service, 'request').returns(promise);
    const send = sandbox.spy(service, 'sendTitleChanged');

    assert.doesNotThrow(() => events.emit(EVENT_NAME, titleModel(SAMPLE_TITLE)));
    sinon.assert.calledOnce(request);
    sinon.assert.calledOnce(loggedInfo);
    sinon.assert.notCalled(loggedError);

    reject(Object.assign(new Error('unavailable'), { response: { statusCode: 503 } }));
    await send.lastCall.returnValue;
    sinon.assert.calledOnceWithExactly(
      loggedError,
      `Failed to send content check webhook to "${WEBHOOK_ORIGIN}": HTTP 503`,
    );
  });
});
