import assert from 'node:assert/strict';
import sinon from 'sinon';
import type { InternalKeys } from '../../../../../core/server/services/internal-keys';

const internalKeysRoot = require('../../../../../core/server/services/internal-keys')
  .default as typeof import('../../../../../core/server/services/internal-keys').default;
const models = require('../../../../../core/server/models');
const { getFrontendKey } = require('../../../../../core/frontend/services/proxy');
const { default: resetAuthentication } =
  require('../../../../../core/server/auth/reset-authentication') as typeof import('../../../../../core/server/auth/reset-authentication');

describe('Internal keys root', function () {
  const sandbox = sinon.createSandbox();
  let previousEntries: Array<[Parameters<InternalKeys['get']>[0], ReturnType<InternalKeys['get']>]>;
  let lookup: sinon.SinonStub;
  let internalKeys: InternalKeys;

  beforeAll(async function () {
    await internalKeysRoot.init();
    internalKeys = internalKeysRoot.service;
  });

  beforeEach(function () {
    previousEntries = Array.from(internalKeys.entries());
    internalKeys.clear();
    lookup = sandbox.stub(models.Integration, 'getApiKeyBySlug');
  });

  afterEach(function () {
    sandbox.restore();
    internalKeys.clear();
    for (const [slug, promise] of previousEntries) {
      internalKeys.set(slug, promise);
    }
  });

  it('looks up the correct type for each internal integration and shares pending lookups', async function () {
    const scheduler = Promise.withResolvers<{ id: string; secret: string }>();
    const frontend = Promise.withResolvers<{ id: string; secret: string }>();
    lookup.withArgs('ghost-scheduler', 'admin').returns(scheduler.promise);
    lookup.withArgs('ghost-internal-frontend', 'content').returns(frontend.promise);

    const firstScheduler = internalKeys.get('ghost-scheduler');
    const firstFrontend = internalKeys.get('ghost-internal-frontend');
    assert.equal(internalKeys.get('ghost-scheduler'), firstScheduler);
    assert.equal(internalKeys.get('ghost-internal-frontend'), firstFrontend);
    assert.equal(firstScheduler, scheduler.promise);
    assert.equal(firstFrontend, frontend.promise);
    assert.deepEqual(lookup.args, [
      ['ghost-scheduler', 'admin'],
      ['ghost-internal-frontend', 'content'],
    ]);

    const adminKey = { id: 'scheduler-id', secret: 'scheduler-secret' };
    const contentKey = { id: 'frontend-id', secret: 'frontend-secret' };
    scheduler.resolve(adminKey);
    frontend.resolve(contentKey);
    assert.equal(await firstScheduler, adminKey);
    assert.equal(await firstFrontend, contentKey);
    assert.equal(internalKeys.get('ghost-scheduler'), firstScheduler);
    sinon.assert.calledTwice(lookup);
  });

  it('retains a rejected lookup until the owning integration is invalidated', async function () {
    const failure = new Error('Internal integration is unavailable');
    lookup.onFirstCall().rejects(failure);
    const replacement = { id: 'scheduler-id', secret: 'replacement' };
    lookup.onSecondCall().resolves(replacement);

    const failed = internalKeys.get('ghost-scheduler');
    await assert.rejects(failed, (error) => error === failure);
    assert.equal(internalKeys.get('ghost-scheduler'), failed);
    sinon.assert.calledOnce(lookup);

    assert.equal(internalKeys.delete('ghost-scheduler'), true);
    assert.equal(await internalKeys.get('ghost-scheduler'), replacement);
    sinon.assert.calledTwice(lookup);
  });

  it('keeps a new lookup after invalidation even when the old pending lookup finishes later', async function () {
    const pending = Promise.withResolvers<{ id: string; secret: string }>();
    lookup.onFirstCall().returns(pending.promise);
    const current = { id: 'frontend-id', secret: 'current' };
    lookup.onSecondCall().resolves(current);

    const retained = internalKeys.get('ghost-internal-frontend');
    internalKeys.clear();
    const replacement = internalKeys.get('ghost-internal-frontend');
    assert.notEqual(retained, replacement);
    assert.equal(await replacement, current);

    const previous = { id: 'frontend-id', secret: 'previous' };
    pending.resolve(previous);
    assert.equal(await retained, previous);
    assert.equal(internalKeys.get('ghost-internal-frontend'), replacement);
    assert.equal(await internalKeys.get('ghost-internal-frontend'), current);
    sinon.assert.calledTwice(lookup);
  });

  it('makes a retained frontend consumer read the new content key after rotation invalidates the map', async function () {
    lookup.onFirstCall().resolves({ id: 'frontend-id', secret: 'before-rotation' });
    lookup.onSecondCall().resolves({ id: 'frontend-id', secret: 'after-rotation' });

    assert.equal(await getFrontendKey(), 'before-rotation');
    assert.equal(await getFrontendKey(), 'before-rotation');
    sinon.assert.calledOnceWithExactly(lookup, 'ghost-internal-frontend', 'content');

    internalKeys.clear();

    assert.equal(await getFrontendKey(), 'after-rotation');
    sinon.assert.calledTwice(lookup);
    sinon.assert.alwaysCalledWithExactly(lookup, 'ghost-internal-frontend', 'content');
  });

  it('shares the default map with authentication rotation and rescheduling after commit', async function () {
    const previousSchedulerKey = { id: 'scheduler-id', secret: 'before-rotation' };
    const previousFrontendKey = { id: 'frontend-id', secret: 'before-rotation' };
    const currentSchedulerKey = { id: 'scheduler-id', secret: 'after-rotation' };
    const currentFrontendKey = { id: 'frontend-id', secret: 'after-rotation' };
    lookup
      .withArgs('ghost-scheduler', 'admin')
      .onFirstCall()
      .resolves(previousSchedulerKey)
      .onSecondCall()
      .resolves(currentSchedulerKey);
    lookup
      .withArgs('ghost-internal-frontend', 'content')
      .onFirstCall()
      .resolves(previousFrontendKey)
      .onSecondCall()
      .resolves(currentFrontendKey);
    assert.equal(await getFrontendKey(), previousFrontendKey.secret);
    assert.equal(await internalKeys.get('ghost-scheduler'), previousSchedulerKey);

    const commit = Promise.withResolvers<void>();
    const writesFinished = Promise.withResolvers<void>();
    const domain = {
      Base: {
        transaction: async (write: (tx: object) => Promise<unknown>) => {
          const result = await write({});
          writesFinished.resolve();
          await commit.promise;
          return result;
        },
      },
      ApiKey: { refreshAllSecrets: async () => ({ count: 2 }) },
    };
    const deleteAllSessions = sandbox.stub().resolves();
    const rescheduleAll = sandbox.stub().callsFake(async ({ previousKey }) => {
      assert.equal(previousKey, previousSchedulerKey);
      assert.equal(await internalKeys.get('ghost-scheduler'), currentSchedulerKey);
      assert.equal(await getFrontendKey(), currentFrontendKey.secret);
    });
    const rotation = resetAuthentication({
      schedulerAdapter: { rescheduleAll },
      userService: { lockAll: async () => ({ count: 1 }) },
      options: {},
      models: domain,
      deleteAllSessions,
      // Use the consumer's real default map rather than injecting a replacement.
    });
    try {
      await Promise.race([writesFinished.promise, rotation]);
      assert.equal(await getFrontendKey(), previousFrontendKey.secret);
      assert.equal(await internalKeys.get('ghost-scheduler'), previousSchedulerKey);
      sinon.assert.notCalled(deleteAllSessions);
      sinon.assert.notCalled(rescheduleAll);
    } finally {
      commit.resolve();
      await Promise.allSettled([rotation]);
    }
    assert.deepEqual(await rotation, { apiKeysRotated: 2, usersLocked: 1 });
    sinon.assert.calledOnce(deleteAllSessions);
    sinon.assert.calledOnce(rescheduleAll);
    sinon.assert.callOrder(deleteAllSessions, rescheduleAll);
    assert.equal(await getFrontendKey(), currentFrontendKey.secret);
    sinon.assert.calledWithExactly(lookup, 'ghost-scheduler', 'admin');
    sinon.assert.calledWithExactly(lookup, 'ghost-internal-frontend', 'content');
    sinon.assert.callCount(lookup, 4);
  });
});
