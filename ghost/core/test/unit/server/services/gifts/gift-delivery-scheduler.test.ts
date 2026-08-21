import assert from 'node:assert/strict';
import sinon from 'sinon';
import { GiftDeliveryScheduler } from '../../../../../core/server/services/gifts/gift-delivery-scheduler';
import { AutoFillingMap } from '../../../../../core/server/lib/auto-filling-map';
import type {
  InternalApiKey,
  InternalIntegrationSlug,
} from '../../../../../core/server/services/internal-keys';

const HEX_CURRENT = 'aa'.repeat(32);
const HEX_OLD = '55'.repeat(32);

function buildDeps(pending: Date[] = []) {
  const internalKeys = new AutoFillingMap<InternalIntegrationSlug, Promise<InternalApiKey>>(
    (slug) => Promise.reject(new Error(`Missing test key for ${slug}`)),
  );
  internalKeys.set('ghost-scheduler', Promise.resolve({ id: 'key', secret: HEX_CURRENT }));
  return {
    apiUrl: 'https://example.com/ghost/api/admin',
    adapter: {
      schedule: sinon.stub(),
      unschedule: sinon.stub(),
      register: sinon.stub(),
      run: sinon.stub(),
    },
    internalKeys,
    findScheduled: sinon.stub().resolves(pending),
  };
}

describe('GiftDeliveryScheduler', function () {
  afterEach(function () {
    sinon.restore();
  });

  it('registers with the scheduler adapter', function () {
    const deps = buildDeps();
    new GiftDeliveryScheduler(deps);

    sinon.assert.calledOnce(deps.adapter.register);
    assert.equal(typeof deps.adapter.register.firstCall.firstArg.rescheduleAll, 'function');
  });

  it('schedules the flush callback just past gift redemption availability', async function () {
    const deps = buildDeps();
    const scheduler = new GiftDeliveryScheduler(deps);
    const redeemableAt = new Date(Date.now() + 60_000);

    await scheduler.scheduleFor('delivery_1', redeemableAt);

    const job = deps.adapter.schedule.firstCall.firstArg;
    // The adapter can ping up to 50ms early and the flush query truncates
    // "now" to whole seconds, so an exactly on-time job could find nothing
    // due — the job is armed a second late instead.
    assert.equal(job.time, redeemableAt.getTime() + 1000);
    assert.equal(job.extra.httpMethod, 'PUT');
    assert.ok(job.url.startsWith(`${deps.apiUrl}/gifts/flush_deliveries?token=`));
  });

  it('retries scheduling a time whose earlier attempt failed to fetch a key', async function () {
    const deps = buildDeps();
    const failingKeys = new AutoFillingMap<InternalIntegrationSlug, Promise<InternalApiKey>>(
      (slug) => Promise.reject(new Error(`Missing test key for ${slug}`)),
    );
    const rejection = Promise.reject(new Error('Transient key failure'));
    rejection.catch(() => {});
    failingKeys.set('ghost-scheduler', rejection);
    const scheduler = new GiftDeliveryScheduler({ ...deps, internalKeys: failingKeys });
    const redeemableAt = new Date(Date.now() + 60_000);

    await scheduler.scheduleFor('delivery_1', redeemableAt);
    sinon.assert.notCalled(deps.adapter.schedule);

    failingKeys.set('ghost-scheduler', Promise.resolve({ id: 'key', secret: HEX_CURRENT }));
    await scheduler.scheduleFor('delivery_2', redeemableAt);

    sinon.assert.calledOnce(deps.adapter.schedule);
  });

  it('schedules one batch flush for deliveries with the same availability', async function () {
    const deps = buildDeps();
    const scheduler = new GiftDeliveryScheduler(deps);
    const redeemableAt = new Date(Date.now() + 60_000);

    await scheduler.scheduleFor('delivery_1', redeemableAt);
    await scheduler.scheduleFor('delivery_2', redeemableAt);

    sinon.assert.calledOnce(deps.adapter.schedule);
  });

  it('does not schedule an already-due delivery', async function () {
    const deps = buildDeps();
    const scheduler = new GiftDeliveryScheduler(deps);

    await scheduler.scheduleFor('delivery_1', new Date(Date.now() - 1));

    sinon.assert.notCalled(deps.adapter.schedule);
  });

  it('re-signs each pending future delivery time once during key rotation', async function () {
    const redeemableAt = new Date(Date.now() + 60_000);
    const deps = buildDeps([redeemableAt]);
    const scheduler = new GiftDeliveryScheduler(deps);

    await scheduler.rescheduleAll({ previousKey: { id: 'key', secret: HEX_OLD } });

    sinon.assert.calledOnce(deps.adapter.unschedule);
    sinon.assert.calledOnce(deps.adapter.schedule);
    assert.notEqual(
      deps.adapter.unschedule.firstCall.firstArg.url,
      deps.adapter.schedule.firstCall.firstArg.url,
    );
    assert.equal(deps.adapter.unschedule.firstCall.args[1].bootstrap, false);
  });
});
