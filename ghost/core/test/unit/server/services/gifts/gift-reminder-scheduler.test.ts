import assert from 'node:assert/strict';
import sinon from 'sinon';
import {GiftReminderScheduler} from '../../../../../core/server/services/gifts/gift-reminder-scheduler';
import {Gift} from '../../../../../core/server/services/gifts/gift';
import {AutoFillingMap} from '../../../../../core/server/lib/auto-filling-map';
import type {InternalApiKey, InternalIntegrationSlug} from '../../../../../core/server/services/internal-keys';
import {buildGift} from './utils';

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

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

    const findUnsentReminders = sinon.stub<[], Promise<Gift[]>>().resolves(overrides.pending ?? []);

    return {
        apiUrl,
        adapter: {schedule, unschedule, register, run},
        internalKeys,
        findUnsentReminders,
        currentKey
    };
}

function futureGift(daysAhead: number) {
    return buildGift({
        token: `tok-${daysAhead}`,
        status: 'redeemed',
        redeemerMemberId: 'm_1',
        redeemedAt: new Date(),
        consumesAt: new Date(Date.now() + daysAhead * 24 * 60 * 60 * 1000)
    });
}

describe('GiftReminderScheduler', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('registers itself with the adapter on construction', function () {
        const deps = buildDeps();
        const scheduler = new GiftReminderScheduler(deps);

        sinon.assert.calledOnceWithExactly(deps.adapter.register, scheduler);
    });

    describe('scheduleFor', function () {
        it('queues a reminder 7 days before consumesAt, signed with the current key', async function () {
            const deps = buildDeps();
            const scheduler = new GiftReminderScheduler(deps);
            const gift = futureGift(30);

            await scheduler.scheduleFor(gift);

            sinon.assert.calledOnce(deps.adapter.schedule);
            const [job] = deps.adapter.schedule.getCall(0).args;
            assert.equal(job.time, gift.consumesAt!.getTime() - SEVEN_DAYS_MS);
            assert.equal(job.extra.httpMethod, 'PUT');
            assert.ok(job.url.startsWith(`${deps.apiUrl}/gifts/flush_reminders?token=`),
                'the URL targets the flush_reminders endpoint and carries a JWT');
        });

        it('does not queue when the gift has no consumesAt', async function () {
            const deps = buildDeps();
            const scheduler = new GiftReminderScheduler(deps);

            await scheduler.scheduleFor(buildGift({consumesAt: null}));

            sinon.assert.notCalled(deps.adapter.schedule);
        });

        it('does not queue when the reminder time has already passed', async function () {
            const deps = buildDeps();
            const scheduler = new GiftReminderScheduler(deps);
            // consumesAt 1 day ahead → reminder fires at consumesAt - 7d → in the past
            await scheduler.scheduleFor(futureGift(1));

            sinon.assert.notCalled(deps.adapter.schedule);
        });
    });

    describe('rescheduleAll', function () {
        it('re-signs every pending reminder under the current key', async function () {
            const pending = [futureGift(30), futureGift(60)];
            const deps = buildDeps({pending, currentKey: {id: 'k', secret: HEX_CURRENT}});
            const scheduler = new GiftReminderScheduler(deps);

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
            // Outcome: rotation requests a real (non-bootstrap) unschedule so
            // the adapter writes a tombstone and the stale callback is
            // suppressed at execution time. SchedulingDefault's own tests
            // cover the tombstone semantics; here we verify GiftReminderScheduler
            // honours the contract.
            const deps = buildDeps({pending: [futureGift(30)]});
            const scheduler = new GiftReminderScheduler(deps);

            await scheduler.rescheduleAll({previousKey: {id: 'k', secret: HEX_OLD}});

            sinon.assert.calledOnce(deps.adapter.unschedule);
            assert.equal(deps.adapter.unschedule.getCall(0).args[1].bootstrap, false);
        });

        it('uses the current key for unschedule when previousKey is omitted', async function () {
            const pending = [futureGift(30)];
            const deps = buildDeps({pending});
            const scheduler = new GiftReminderScheduler(deps);

            await scheduler.rescheduleAll();

            sinon.assert.calledOnce(deps.adapter.unschedule);
            sinon.assert.calledOnce(deps.adapter.schedule);
            const unscheduleUrl = deps.adapter.unschedule.getCall(0).args[0].url;
            const scheduleUrl = deps.adapter.schedule.getCall(0).args[0].url;
            assert.equal(unscheduleUrl, scheduleUrl,
                'with no previousKey, both URLs are signed under the same (current) key');
        });

        it('same-key rebuild marks unschedule as bootstrap so the new job survives', async function () {
            // Outcome: when no previousKey is supplied (boot), unschedule and
            // schedule use the same URL. GiftReminderScheduler must mark the
            // unschedule as bootstrap so the adapter skips the tombstone and
            // the about-to-be-scheduled job stays pingable.
            const deps = buildDeps({pending: [futureGift(30)]});
            const scheduler = new GiftReminderScheduler(deps);

            await scheduler.rescheduleAll();

            sinon.assert.calledOnce(deps.adapter.unschedule);
            assert.equal(deps.adapter.unschedule.getCall(0).args[1].bootstrap, true);
        });

        it('skips reminders whose fire time has already passed', async function () {
            const deps = buildDeps({pending: [futureGift(1)]});
            const scheduler = new GiftReminderScheduler(deps);

            await scheduler.rescheduleAll({previousKey: {id: 'k', secret: HEX_OLD}});

            sinon.assert.notCalled(deps.adapter.unschedule);
            sinon.assert.notCalled(deps.adapter.schedule);
        });

        it('is a no-op when the repository has nothing pending', async function () {
            const deps = buildDeps({pending: []});
            const scheduler = new GiftReminderScheduler(deps);

            await scheduler.rescheduleAll({previousKey: {id: 'k', secret: HEX_OLD}});

            sinon.assert.notCalled(deps.adapter.schedule);
            sinon.assert.notCalled(deps.adapter.unschedule);
        });
    });
});
