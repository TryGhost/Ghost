import assert from 'node:assert/strict';
import logging from '@tryghost/logging';
import sinon from 'sinon';
import { SignedFlushScheduler } from '../../../../../core/server/adapters/scheduling/signed-flush-scheduler';
import { AutoFillingMap } from '../../../../../core/server/lib/auto-filling-map';
import type {
  InternalApiKey,
  InternalIntegrationSlug,
} from '../../../../../core/server/services/internal-keys';

// Use distinct 64-character hex secrets because token signing decodes them as hex.
const HEX_CURRENT = 'aa'.repeat(32);
const HEX_OLD = '55'.repeat(32);

function buildDeps(
  overrides: {
    pending?: number[];
    currentKey?: InternalApiKey;
  } = {},
) {
  const apiUrl = 'https://example.com/ghost/api/admin';
  const currentKey: InternalApiKey = overrides.currentKey ?? { id: 'kid', secret: HEX_CURRENT };
  const internalKeys = new AutoFillingMap<InternalIntegrationSlug, Promise<InternalApiKey>>(
    (slug) => Promise.reject(new Error(`Test internalKeys not seeded for slug ${slug}`)),
  );
  internalKeys.set('ghost-scheduler', Promise.resolve(currentKey));

  return {
    apiUrl,
    adapter: {
      schedule: sinon.stub(),
      unschedule: sinon.stub(),
      register: sinon.stub(),
      run: sinon.stub(),
    },
    internalKeys,
    endpoint: ['gifts', 'flush_deliveries'],
    name: 'gift_delivery',
    findScheduledTimes: sinon.stub<[], Promise<number[]>>().resolves(overrides.pending ?? []),
  };
}

describe('SignedFlushScheduler', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('registers itself with the adapter on construction', function () {
    const deps = buildDeps();
    new SignedFlushScheduler(deps);

    sinon.assert.calledOnce(deps.adapter.register);
    assert.equal(typeof deps.adapter.register.firstCall.firstArg.rescheduleAll, 'function');
  });

  describe('scheduleAt', function () {
    it('arms a flush callback just past the given time, signed with the current key', async function () {
      const deps = buildDeps();
      const scheduler = new SignedFlushScheduler(deps);
      const time = Date.now() + 60_000;

      await scheduler.scheduleAt(time);

      sinon.assert.calledOnce(deps.adapter.schedule);
      const [job] = deps.adapter.schedule.getCall(0).args;
      assert.equal(job.time, Math.floor(time / 1000) * 1000 + 1000);
      assert.equal(job.extra.httpMethod, 'PUT');
      assert.ok(
        job.url.startsWith(`${deps.apiUrl}/gifts/flush_deliveries?token=`),
        'the URL targets the configured flush endpoint and carries a JWT',
      );
    });

    it('targets the configured endpoint', async function () {
      const deps = { ...buildDeps(), endpoint: ['gifts', 'flush_reminders'] };
      const scheduler = new SignedFlushScheduler(deps);

      await scheduler.scheduleAt(Date.now() + 60_000);

      const [job] = deps.adapter.schedule.getCall(0).args;
      assert.ok(job.url.startsWith(`${deps.apiUrl}/gifts/flush_reminders?token=`));
    });

    it('does not arm an already-due time', async function () {
      const deps = buildDeps();
      const scheduler = new SignedFlushScheduler(deps);

      await scheduler.scheduleAt(Date.now() - 1);

      sinon.assert.notCalled(deps.adapter.schedule);
    });

    it('arms one batch flush for repeat schedules of the same time', async function () {
      const deps = buildDeps();
      const scheduler = new SignedFlushScheduler(deps);
      const time = Date.now() + 60_000;

      await scheduler.scheduleAt(time, { deliveryId: 'delivery_1' });
      await scheduler.scheduleAt(time, { deliveryId: 'delivery_2' });

      sinon.assert.calledOnce(deps.adapter.schedule);
    });

    it('deduplicates times within the same persisted database second', async function () {
      const deps = buildDeps();
      const scheduler = new SignedFlushScheduler(deps);
      const second = Math.floor((Date.now() + 60_000) / 1000) * 1000;

      await scheduler.scheduleAt(second + 123);
      await scheduler.scheduleAt(second + 987);

      sinon.assert.calledOnce(deps.adapter.schedule);
      assert.equal(deps.adapter.schedule.firstCall.firstArg.time, second + 1000);
    });

    it('does not let synchronous job construction failures escape', async function () {
      const deps = { ...buildDeps(), apiUrl: 'not a url' };
      const scheduler = new SignedFlushScheduler(deps);
      const logError = sinon.stub(logging, 'error');

      await scheduler.scheduleAt(Date.now() + 60_000);

      sinon.assert.notCalled(deps.adapter.schedule);
      sinon.assert.calledOnce(logError);
    });

    it('retries after a synchronous adapter failure', async function () {
      const deps = buildDeps();
      deps.adapter.schedule.onFirstCall().throws(new Error('adapter failed'));
      const scheduler = new SignedFlushScheduler(deps);
      sinon.stub(logging, 'error');
      const time = Date.now() + 60_000;

      await scheduler.scheduleAt(time);
      await scheduler.scheduleAt(time);

      sinon.assert.calledTwice(deps.adapter.schedule);
    });

    it('retries scheduling a time whose earlier attempt failed to fetch a key', async function () {
      const deps = buildDeps();
      const failingKeys = new AutoFillingMap<InternalIntegrationSlug, Promise<InternalApiKey>>(
        (slug) => Promise.reject(new Error(`Missing test key for ${slug}`)),
      );
      const rejection = Promise.reject(new Error('Transient key failure'));
      rejection.catch(() => {});
      failingKeys.set('ghost-scheduler', rejection);
      const scheduler = new SignedFlushScheduler({ ...deps, internalKeys: failingKeys });
      const time = Date.now() + 60_000;

      await scheduler.scheduleAt(time);
      sinon.assert.notCalled(deps.adapter.schedule);

      failingKeys.set('ghost-scheduler', Promise.resolve({ id: 'key', secret: HEX_CURRENT }));
      await scheduler.scheduleAt(time);

      sinon.assert.calledOnce(deps.adapter.schedule);
    });
  });

  describe('rescheduleAll', function () {
    it('re-signs every pending time under the current key', async function () {
      const pending = [Date.now() + 30_000, Date.now() + 60_000];
      const deps = buildDeps({ pending, currentKey: { id: 'k', secret: HEX_CURRENT } });
      const scheduler = new SignedFlushScheduler(deps);

      await scheduler.rescheduleAll({ previousKey: { id: 'k', secret: HEX_OLD } });

      sinon.assert.calledTwice(deps.adapter.unschedule);
      sinon.assert.calledTwice(deps.adapter.schedule);

      // The stale job must be addressed with a token signed by the previous key.
      const unscheduleUrls = deps.adapter.unschedule.getCalls().map((c) => c.args[0].url);
      const scheduleUrls = deps.adapter.schedule.getCalls().map((c) => c.args[0].url);
      for (let i = 0; i < pending.length; i++) {
        assert.notEqual(
          unscheduleUrls[i],
          scheduleUrls[i],
          `pending[${i}]: unschedule URL (old key) must differ from schedule URL (current key)`,
        );
      }
    });

    it('unschedules stale old-key jobs during rotation', async function () {
      // Non-bootstrap unscheduling tombstones the stale callback.
      const deps = buildDeps({ pending: [Date.now() + 30_000] });
      const scheduler = new SignedFlushScheduler(deps);

      await scheduler.rescheduleAll({ previousKey: { id: 'k', secret: HEX_OLD } });

      sinon.assert.calledOnce(deps.adapter.unschedule);
      assert.equal(deps.adapter.unschedule.getCall(0).args[1].bootstrap, false);
    });

    it('also unschedules pre-upgrade reminder jobs during key rotation', async function () {
      const time = Math.floor((Date.now() + 30_000) / 1000) * 1000;
      const deps = {
        ...buildDeps({ pending: [time] }),
        endpoint: ['gifts', 'flush_reminders'],
        legacyDelaysMs: [0],
      };
      const scheduler = new SignedFlushScheduler(deps);

      await scheduler.rescheduleAll({ previousKey: { id: 'k', secret: HEX_OLD } });

      sinon.assert.calledTwice(deps.adapter.unschedule);
      assert.equal(deps.adapter.unschedule.firstCall.firstArg.time, time + 1000);
      assert.equal(deps.adapter.unschedule.secondCall.firstArg.time, time);
      sinon.assert.calledOnce(deps.adapter.schedule);
    });

    it('does not tombstone the replacement during boot rebuilds', async function () {
      // Boot reuses the current-key URL, so unscheduling must use bootstrap mode.
      const deps = buildDeps({ pending: [Date.now() + 30_000] });
      const scheduler = new SignedFlushScheduler(deps);

      await scheduler.rescheduleAll();

      sinon.assert.calledOnce(deps.adapter.unschedule);
      sinon.assert.calledOnce(deps.adapter.schedule);
      assert.equal(deps.adapter.unschedule.getCall(0).args[1].bootstrap, true);
      assert.equal(
        deps.adapter.unschedule.getCall(0).args[0].url,
        deps.adapter.schedule.getCall(0).args[0].url,
        'with no previousKey, both URLs are signed under the same (current) key',
      );
    });

    it('rebuilds duplicate pending times as one job', async function () {
      const time = Date.now() + 30_000;
      const deps = buildDeps({ pending: [time, time] });
      const scheduler = new SignedFlushScheduler(deps);

      await scheduler.rescheduleAll({ previousKey: { id: 'k', secret: HEX_OLD } });

      sinon.assert.calledOnce(deps.adapter.schedule);
    });

    it('skips times that have already passed', async function () {
      const deps = buildDeps({ pending: [Date.now() - 1] });
      const scheduler = new SignedFlushScheduler(deps);

      await scheduler.rescheduleAll({ previousKey: { id: 'k', secret: HEX_OLD } });

      sinon.assert.notCalled(deps.adapter.unschedule);
      sinon.assert.notCalled(deps.adapter.schedule);
    });

    it('is a no-op when nothing is pending', async function () {
      const deps = buildDeps({ pending: [] });
      const scheduler = new SignedFlushScheduler(deps);

      await scheduler.rescheduleAll({ previousKey: { id: 'k', secret: HEX_OLD } });

      sinon.assert.notCalled(deps.adapter.schedule);
      sinon.assert.notCalled(deps.adapter.unschedule);
    });
  });
});
