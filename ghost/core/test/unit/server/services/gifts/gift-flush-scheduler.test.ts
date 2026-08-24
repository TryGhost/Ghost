import assert from 'node:assert/strict';
import sinon from 'sinon';
import { GiftFlushScheduler } from '../../../../../core/server/services/gifts/gift-flush-scheduler';
import { AutoFillingMap } from '../../../../../core/server/lib/auto-filling-map';
import type {
  InternalApiKey,
  InternalIntegrationSlug,
} from '../../../../../core/server/services/internal-keys';

/**
 * Build an in-memory pretend of the cross-domain deps the scheduler takes.
 * Tests assert on the queued jobs (the observable outcome) and on which
 * pending times were consulted; same-domain primitives (getSignedAdminToken,
 * urlUtils) are real imports inside the class.
 */
// Test secrets are 64-char hex so getSignedAdminToken (which decodes via
// Buffer.from(secret, 'hex')) treats them as distinct signing keys.
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
    endpoint: 'flush_deliveries' as const,
    name: 'gift_delivery',
    findScheduledTimes: sinon.stub<[], Promise<number[]>>().resolves(overrides.pending ?? []),
  };
}

describe('GiftFlushScheduler', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('registers itself with the adapter on construction', function () {
    const deps = buildDeps();
    new GiftFlushScheduler(deps);

    sinon.assert.calledOnce(deps.adapter.register);
    assert.equal(typeof deps.adapter.register.firstCall.firstArg.rescheduleAll, 'function');
  });

  describe('scheduleAt', function () {
    it('arms a flush callback just past the given time, signed with the current key', async function () {
      const deps = buildDeps();
      const scheduler = new GiftFlushScheduler(deps);
      const time = Date.now() + 60_000;

      await scheduler.scheduleAt(time);

      sinon.assert.calledOnce(deps.adapter.schedule);
      const [job] = deps.adapter.schedule.getCall(0).args;
      // Armed a second past the given time: the adapter can ping up to
      // 50ms early and the flush query truncates "now" to whole seconds,
      // so an exactly on-time job could find nothing due.
      assert.equal(job.time, time + 1000);
      assert.equal(job.extra.httpMethod, 'PUT');
      assert.ok(
        job.url.startsWith(`${deps.apiUrl}/gifts/flush_deliveries?token=`),
        'the URL targets the configured flush endpoint and carries a JWT',
      );
    });

    it('targets the configured endpoint', async function () {
      const deps = { ...buildDeps(), endpoint: 'flush_reminders' as const };
      const scheduler = new GiftFlushScheduler(deps);

      await scheduler.scheduleAt(Date.now() + 60_000);

      const [job] = deps.adapter.schedule.getCall(0).args;
      assert.ok(job.url.startsWith(`${deps.apiUrl}/gifts/flush_reminders?token=`));
    });

    it('does not arm an already-due time', async function () {
      const deps = buildDeps();
      const scheduler = new GiftFlushScheduler(deps);

      await scheduler.scheduleAt(Date.now() - 1);

      sinon.assert.notCalled(deps.adapter.schedule);
    });

    it('arms one batch flush for repeat schedules of the same time', async function () {
      const deps = buildDeps();
      const scheduler = new GiftFlushScheduler(deps);
      const time = Date.now() + 60_000;

      await scheduler.scheduleAt(time, { deliveryId: 'delivery_1' });
      await scheduler.scheduleAt(time, { deliveryId: 'delivery_2' });

      sinon.assert.calledOnce(deps.adapter.schedule);
    });

    it('retries scheduling a time whose earlier attempt failed to fetch a key', async function () {
      const deps = buildDeps();
      const failingKeys = new AutoFillingMap<InternalIntegrationSlug, Promise<InternalApiKey>>(
        (slug) => Promise.reject(new Error(`Missing test key for ${slug}`)),
      );
      const rejection = Promise.reject(new Error('Transient key failure'));
      rejection.catch(() => {});
      failingKeys.set('ghost-scheduler', rejection);
      const scheduler = new GiftFlushScheduler({ ...deps, internalKeys: failingKeys });
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
      const scheduler = new GiftFlushScheduler(deps);

      await scheduler.rescheduleAll({ previousKey: { id: 'k', secret: HEX_OLD } });

      sinon.assert.calledTwice(deps.adapter.unschedule);
      sinon.assert.calledTwice(deps.adapter.schedule);

      // The schedule URLs are signed under the current key; the unschedule
      // URLs are signed under the previous key. Their tokens must differ
      // for the adapter to find the queued entries.
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

    it('rotation tells the adapter to actually delete the stale queued job', async function () {
      // Outcome: rotation requests a real (non-bootstrap) unschedule so
      // the adapter writes a tombstone and the stale callback is
      // suppressed at execution time. SchedulingDefault's own tests
      // cover the tombstone semantics; here we verify GiftFlushScheduler
      // honours the contract.
      const deps = buildDeps({ pending: [Date.now() + 30_000] });
      const scheduler = new GiftFlushScheduler(deps);

      await scheduler.rescheduleAll({ previousKey: { id: 'k', secret: HEX_OLD } });

      sinon.assert.calledOnce(deps.adapter.unschedule);
      assert.equal(deps.adapter.unschedule.getCall(0).args[1].bootstrap, false);
    });

    it('same-key rebuild marks unschedule as bootstrap so the new job survives', async function () {
      // Outcome: when no previousKey is supplied (boot), unschedule and
      // schedule use the same URL. GiftFlushScheduler must mark the
      // unschedule as bootstrap so the adapter skips the tombstone and
      // the about-to-be-scheduled job stays pingable.
      const deps = buildDeps({ pending: [Date.now() + 30_000] });
      const scheduler = new GiftFlushScheduler(deps);

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
      const scheduler = new GiftFlushScheduler(deps);

      await scheduler.rescheduleAll({ previousKey: { id: 'k', secret: HEX_OLD } });

      sinon.assert.calledOnce(deps.adapter.schedule);
    });

    it('skips times that have already passed', async function () {
      const deps = buildDeps({ pending: [Date.now() - 1] });
      const scheduler = new GiftFlushScheduler(deps);

      await scheduler.rescheduleAll({ previousKey: { id: 'k', secret: HEX_OLD } });

      sinon.assert.notCalled(deps.adapter.unschedule);
      sinon.assert.notCalled(deps.adapter.schedule);
    });

    it('is a no-op when nothing is pending', async function () {
      const deps = buildDeps({ pending: [] });
      const scheduler = new GiftFlushScheduler(deps);

      await scheduler.rescheduleAll({ previousKey: { id: 'k', secret: HEX_OLD } });

      sinon.assert.notCalled(deps.adapter.schedule);
      sinon.assert.notCalled(deps.adapter.unschedule);
    });
  });
});
