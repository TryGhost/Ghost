import assert from 'node:assert/strict';
import sinon from 'sinon';
import {GiftDeliveryScheduler} from '../../../../../core/server/services/gifts/gift-delivery-scheduler';
import {Gift} from '../../../../../core/server/services/gifts/gift';
import {AutoFillingMap} from '../../../../../core/server/lib/auto-filling-map';
import type {InternalApiKey, InternalIntegrationSlug} from '../../../../../core/server/services/internal-keys';
import {buildGift} from './utils';

/**
 * Build an in-memory pretend of the cross-domain deps the scheduler takes.
 * Tests assert on the queued jobs (the observable outcome) and on which
 * repository rows were consulted; same-domain primitives (getSignedAdminToken,
 * urlUtils) are real imports inside the class.
 */
// Test secrets are 64-char hex so getSignedAdminToken (which decodes via
// Buffer.from(secret, 'hex')) treats them as distinct signing keys.
const HEX_CURRENT = 'aa'.repeat(32);
const HEX_OLD = '55'.repeat(32);

function buildDeps(overrides: {
    apiUrl?: string;
    pending?: Gift[];
    currentKey?: InternalApiKey;
    register?: sinon.SinonStub;
} = {}) {
    const apiUrl = overrides.apiUrl ?? 'https://example.com/ghost/api/admin';
    const currentKey: InternalApiKey = overrides.currentKey ?? {id: 'kid', secret: HEX_CURRENT};
    const internalKeys = new AutoFillingMap<InternalIntegrationSlug, Promise<InternalApiKey>>(
        (slug) => {
            throw new Error(`Test internalKeys not seeded for slug ${slug}`);
        }
    );
    internalKeys.set('ghost-scheduler', Promise.resolve(currentKey));

    const schedule = sinon.stub();
    const unschedule = sinon.stub();
    const register = overrides.register ?? sinon.stub();
    const run = sinon.stub();

    const findUnsentDeliveries = sinon.stub<[], Promise<Gift[]>>().resolves(overrides.pending ?? []);

    return {
        apiUrl,
        adapter: {schedule, unschedule, register, run},
        internalKeys,
        findUnsentDeliveries,
        currentKey
    };
}

function scheduledGift(daysAhead: number) {
    return buildGift({
        token: `tok-${daysAhead}`,
        status: 'purchased',
        recipientEmail: 'taylor@example.com',
        deliverAt: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    });
}

describe('GiftDeliveryScheduler', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('registers itself with the adapter on construction', function () {
        const deps = buildDeps();
        const scheduler = new GiftDeliveryScheduler(deps);

        sinon.assert.calledOnceWithExactly(deps.adapter.register, scheduler);
    });

    describe('scheduleFor', function () {
        it('queues a delivery at deliverAt, signed with the current key', async function () {
            const deps = buildDeps();
            const scheduler = new GiftDeliveryScheduler(deps);
            const gift = scheduledGift(30);

            await scheduler.scheduleFor(gift);

            sinon.assert.calledOnce(deps.adapter.schedule);
            const [job] = deps.adapter.schedule.getCall(0).args;
            assert.equal(job.time, gift.deliverAt!.getTime());
            assert.equal(job.extra.httpMethod, 'PUT');
            assert.ok(job.url.startsWith(`${deps.apiUrl}/gifts/flush_deliveries?token=`),
                'the URL targets the flush_deliveries endpoint and carries a JWT');
        });

        it('does not queue when the gift has no deliverAt', async function () {
            const deps = buildDeps();
            const scheduler = new GiftDeliveryScheduler(deps);

            await scheduler.scheduleFor(buildGift({deliverAt: null}));

            sinon.assert.notCalled(deps.adapter.schedule);
        });

        it('does not queue when the delivery time has already passed', async function () {
            const deps = buildDeps();
            const scheduler = new GiftDeliveryScheduler(deps);

            await scheduler.scheduleFor(scheduledGift(-1));

            sinon.assert.notCalled(deps.adapter.schedule);
        });
    });

    describe('rescheduleAll', function () {
        it('re-signs every pending delivery under the current key', async function () {
            const pending = [scheduledGift(30), scheduledGift(60)];
            const deps = buildDeps({pending, currentKey: {id: 'k', secret: HEX_CURRENT}});
            const scheduler = new GiftDeliveryScheduler(deps);

            await scheduler.rescheduleAll({previousKey: {id: 'k', secret: HEX_OLD}});

            sinon.assert.calledTwice(deps.adapter.unschedule);
            sinon.assert.calledTwice(deps.adapter.schedule);

            // The schedule URLs are signed under the current key; the unschedule
            // URLs are signed under the previous key. Their tokens must differ
            // for the adapter to find the queued entries.
            const unscheduleUrls = deps.adapter.unschedule.getCalls().map(c => c.args[0].url);
            const scheduleUrls = deps.adapter.schedule.getCalls().map(c => c.args[0].url);
            for (let i = 0; i < pending.length; i++) {
                assert.notEqual(unscheduleUrls[i], scheduleUrls[i],
                    `pending[${i}]: unschedule URL (old key) must differ from schedule URL (current key)`);
            }
        });

        it('rotation tells the adapter to actually delete the stale queued job', async function () {
            const deps = buildDeps({pending: [scheduledGift(30)]});
            const scheduler = new GiftDeliveryScheduler(deps);

            await scheduler.rescheduleAll({previousKey: {id: 'k', secret: HEX_OLD}});

            sinon.assert.calledOnce(deps.adapter.unschedule);
            assert.equal(deps.adapter.unschedule.getCall(0).args[1].bootstrap, false);
        });

        it('same-key rebuild marks unschedule as bootstrap so the new job survives', async function () {
            const deps = buildDeps({pending: [scheduledGift(30)]});
            const scheduler = new GiftDeliveryScheduler(deps);

            await scheduler.rescheduleAll();

            sinon.assert.calledOnce(deps.adapter.unschedule);
            assert.equal(deps.adapter.unschedule.getCall(0).args[1].bootstrap, true);
        });

        it('skips deliveries whose fire time has already passed', async function () {
            const deps = buildDeps({pending: [scheduledGift(-1)]});
            const scheduler = new GiftDeliveryScheduler(deps);

            await scheduler.rescheduleAll({previousKey: {id: 'k', secret: HEX_OLD}});

            sinon.assert.notCalled(deps.adapter.unschedule);
            sinon.assert.notCalled(deps.adapter.schedule);
        });

        it('is a no-op when the repository has nothing pending', async function () {
            const deps = buildDeps({pending: []});
            const scheduler = new GiftDeliveryScheduler(deps);

            await scheduler.rescheduleAll({previousKey: {id: 'k', secret: HEX_OLD}});

            sinon.assert.notCalled(deps.adapter.schedule);
            sinon.assert.notCalled(deps.adapter.unschedule);
        });
    });
});
