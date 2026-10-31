import assert from 'node:assert/strict';
import sinon from 'sinon';
import { mockSystemTime } from '../../../../utils/clock-utils';

const logging = require('@tryghost/logging');
const { IncorrectUsageError } = require('@tryghost/errors');
const sentry = require('../../../../../core/shared/sentry');
const events = require('../../../../../core/server/lib/common/events');
const urlUtils = require('../../../../../core/shared/url-utils').default;
const adapterManager = require('../../../../../core/server/services/adapter-manager').default;
const internalKeysRoot = require('../../../../../core/server/services/internal-keys').default;
const { getSignedAdminToken } = require('../../../../../core/server/adapters/scheduling/utils');
const {
  getSchedulerIdempotencyKey,
} = require('../../../../../core/server/adapters/scheduling/get-scheduler-idempotency-key');
const PostScheduling =
  require('../../../../../core/server/services/post-scheduling/post-scheduling').default;

const rootPath = require.resolve('../../../../../core/server/services/post-scheduling');

const API_URL = 'https://site.example/ghost/api/admin/';
const NOW = Date.UTC(2026, 5, 1, 12, 0, 0);
const KEY = { id: 'scheduler-key-id', secret: 'aaaabbbbccccdddd' };
const EVENTS = [
  'post.scheduled',
  'post.rescheduled',
  'post.unscheduled',
  'page.scheduled',
  'page.rescheduled',
  'page.unscheduled',
];

function fakeAdapter() {
  return {
    run: sinon.stub(),
    schedule: sinon.stub(),
    unschedule: sinon.stub(),
    register: sinon.stub(),
    rescheduleAll: sinon.stub().resolves(),
  };
}

function scheduledModel(id: string) {
  const publishedAt = new Date(NOW + 60_000);
  return { get: (name: string) => ({ id, published_at: publishedAt })[name], previous: () => null };
}

describe('Post scheduling root', function () {
  const sandbox = sinon.createSandbox();
  let cached: NodeJS.Module | undefined;
  let listenersBefore: Map<string, unknown[]>;
  let adapter: ReturnType<typeof fakeAdapter>;
  let getAdapter: sinon.SinonStub;
  let urlFor: sinon.SinonStub;

  // Loads a fresh copy of the root, as boot's first require does.
  function loadRoot() {
    delete require.cache[rootPath];
    return require(rootPath).default;
  }

  async function initRoot() {
    const root = loadRoot();
    await root.init();
    return root;
  }

  function addedListeners(name: string) {
    const before = listenersBefore.get(name) ?? [];
    return events.listeners(name).filter((listener: unknown) => !before.includes(listener));
  }

  async function emit(name: string, model: unknown) {
    // Await the handlers themselves rather than counting microtask turns.
    await Promise.all(
      addedListeners(name).map((listener: (m: unknown) => unknown) => listener(model)),
    );
  }

  beforeEach(function () {
    mockSystemTime(NOW);
    cached = require.cache[rootPath];
    listenersBefore = new Map(EVENTS.map((name) => [name, events.listeners(name)]));
    adapter = fakeAdapter();
    getAdapter = sandbox.stub(adapterManager, 'getAdapter').returns(adapter);
    urlFor = sandbox.stub(urlUtils, 'urlFor').returns(API_URL);
    sandbox.stub(internalKeysRoot, 'service').get(() => ({ get: sinon.stub().resolves(KEY) }));
  });

  afterEach(function () {
    for (const name of EVENTS) {
      for (const listener of addedListeners(name)) {
        events.removeListener(name, listener);
      }
    }
    if (cached) {
      require.cache[rootPath] = cached;
    } else {
      delete require.cache[rootPath];
    }
    sandbox.restore();
    sinon.restore();
  });

  it('constructs nothing when loaded and publishes one scheduler once init resolves', async function () {
    const root = loadRoot();

    sinon.assert.notCalled(getAdapter);
    assert.throws(() => root.service, IncorrectUsageError);
    for (const name of EVENTS) {
      assert.equal(addedListeners(name).length, 0, name);
    }

    assert.equal(await root.init(), undefined);

    assert.ok(root.service instanceof PostScheduling);
    sinon.assert.calledOnceWithExactly(getAdapter, 'scheduling');
    sinon.assert.calledOnceWithExactly(urlFor, 'api', { type: 'admin' }, true);
    sinon.assert.calledOnceWithExactly(adapter.register, root.service);
    for (const name of EVENTS) {
      assert.equal(addedListeners(name).length, 1, name);
    }
  });

  it('does not construct again on repeated init', async function () {
    const root = await initRoot();
    const service = root.service;

    await root.init();

    assert.equal(root.service, service);
    sinon.assert.calledOnce(getAdapter);
    sinon.assert.calledOnce(adapter.register);
    for (const name of EVENTS) {
      assert.equal(addedListeners(name).length, 1, name);
    }
  });

  it('rejects init when the internal keys service is not ready, subscribing and publishing nothing', async function () {
    sandbox.restore();
    sandbox.stub(adapterManager, 'getAdapter').returns(adapter);
    sandbox.stub(urlUtils, 'urlFor').returns(API_URL);
    sandbox.stub(internalKeysRoot, 'service').get(() => {
      throw new Error('Internal Keys used before init()');
    });

    const root = loadRoot();
    await assert.rejects(root.init(), /Internal Keys used before init/);

    assert.throws(() => root.service, IncorrectUsageError);
    sinon.assert.notCalled(adapter.register);
    for (const name of EVENTS) {
      assert.equal(addedListeners(name).length, 0, name);
    }
  });

  it('rejects init when adapter registration throws, removing its listeners so a retry subscribes once', async function () {
    // init can be retried, so a failed construction unwinds its subscriptions.
    const failure = new Error('register failed');
    adapter.register.onFirstCall().throws(failure);
    const root = loadRoot();

    await assert.rejects(root.init(), (error) => error === failure);

    assert.throws(() => root.service, IncorrectUsageError);
    for (const name of EVENTS) {
      assert.equal(addedListeners(name).length, 0, name);
    }

    await root.init();

    sinon.assert.calledTwice(adapter.register);
    sinon.assert.calledWithExactly(adapter.register.secondCall, root.service);
    for (const name of EVENTS) {
      assert.equal(addedListeners(name).length, 1, name);
    }
  });

  it('schedules signed jobs for the admin API URL it read when initialized', async function () {
    await initRoot();
    urlFor.returns('https://changed.example/ghost/api/admin/');

    await emit('post.scheduled', scheduledModel('p1'));

    const time = NOW + 60_000;
    const url = new URL(`${API_URL}schedules/posts/p1/`);
    url.searchParams.set(
      'token',
      getSignedAdminToken({ publishedAt: new Date(time).toISOString(), apiUrl: API_URL, key: KEY }),
    );
    sinon.assert.calledOnceWithExactly(adapter.schedule, {
      time,
      url: url.toString(),
      extra: {
        httpMethod: 'PUT',
        oldTime: null,
        idempotencyKey: getSchedulerIdempotencyKey({
          namespace: 'post-scheduling',
          date: new Date(time),
          url,
        }),
      },
    });
  });

  it('keeps scheduling on the adapter it was constructed with after the adapter cache changes', async function () {
    // Pinned as today's behaviour: the scheduler captures the adapter once.
    // The e2e lane clears the adapter cache and boots again in one process,
    // and this root keeps the first boot's adapter.
    await initRoot();
    const replacement = fakeAdapter();
    getAdapter.returns(replacement);

    await emit('page.scheduled', scheduledModel('g1'));

    sinon.assert.calledOnce(adapter.schedule);
    sinon.assert.notCalled(replacement.schedule);
    sinon.assert.calledOnce(getAdapter);
  });

  it('reports adapter failures through the error-capturing wrapper', async function () {
    const error = sandbox.stub(logging, 'error');
    const capture = sandbox.stub(sentry, 'captureException');
    const failure = new Error('scheduler down');
    adapter.schedule.throws(failure);
    await initRoot();

    await emit('post.scheduled', scheduledModel('p1'));

    sinon.assert.calledOnceWithExactly(capture, failure);
    sinon.assert.calledOnce(error);
    assert.equal(error.firstCall.args[0].event.name, 'scheduler.schedule.failed');
    assert.equal(error.firstCall.args[0].url, `${API_URL}schedules/posts/p1/`);
  });
});
