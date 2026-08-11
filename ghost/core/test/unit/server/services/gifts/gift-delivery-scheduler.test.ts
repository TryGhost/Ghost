import assert from 'node:assert/strict';
import logging from '@tryghost/logging';
import sinon from 'sinon';
import {GiftDeliveryScheduler} from '../../../../../core/server/services/gifts/gift-delivery-scheduler';
import {AutoFillingMap} from '../../../../../core/server/lib/auto-filling-map';
import type {InternalApiKey, InternalIntegrationSlug} from '../../../../../core/server/services/internal-keys';
import type {GiftDeliverySchedule} from '../../../../../core/server/services/gifts/gift-delivery-bookshelf-repository';
import {buildGiftDelivery} from './utils';

const KEY: InternalApiKey = {id: 'kid', secret: 'aa'.repeat(32)};

function buildDeps(pending: GiftDeliverySchedule[] = []) {
    const internalKeys = new AutoFillingMap<InternalIntegrationSlug, Promise<InternalApiKey>>(() => {
        throw new Error('Unexpected scheduler key');
    });
    internalKeys.set('ghost-scheduler', Promise.resolve(KEY));

    return {
        apiUrl: 'https://example.com/ghost/api/admin',
        adapter: {
            schedule: sinon.stub(),
            unschedule: sinon.stub(),
            register: sinon.stub(),
            run: sinon.stub()
        },
        internalKeys,
        findPendingDeliveries: sinon.stub().resolves(pending),
        countStuckDeliveries: sinon.stub().resolves(0),
        wake: sinon.stub()
    };
}

describe('GiftDeliveryScheduler', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('queues an exact one-shot delivery wake', async function () {
        const deps = buildDeps();
        const scheduler = new GiftDeliveryScheduler(deps);
        const time = new Date(Date.now() + 60_000);

        await scheduler.scheduleAt(time);

        sinon.assert.calledOnce(deps.adapter.schedule);
        const job = deps.adapter.schedule.firstCall.firstArg;
        assert.equal(job.time, time.getTime());
        assert.equal(job.extra.httpMethod, 'PUT');
        assert.ok(job.url.startsWith(`${deps.apiUrl}/gifts/flush_deliveries?token=`));
    });

    it('wakes immediately rather than creating an already-due job', async function () {
        const deps = buildDeps();
        const scheduler = new GiftDeliveryScheduler(deps);

        await scheduler.scheduleAt(new Date(Date.now() - 1));

        sinon.assert.calledOnce(deps.wake);
        sinon.assert.notCalled(deps.adapter.schedule);
    });

    it('performs one startup pass that wakes due gifts and re-arms future retries', async function () {
        const retryAt = new Date(Date.now() + 60_000);
        const deps = buildDeps([
            {
                delivery: buildGiftDelivery(),
                availableAt: new Date(Date.now() - 60_000)
            },
            {
                delivery: buildGiftDelivery({id: 'future-delivery', attemptAt: retryAt}),
                availableAt: new Date(Date.now() - 60_000)
            }
        ]);
        const scheduler = new GiftDeliveryScheduler(deps);

        await scheduler.recoverAll();

        sinon.assert.calledOnce(deps.wake);
        sinon.assert.calledOnce(deps.adapter.unschedule);
        sinon.assert.calledOnce(deps.adapter.schedule);
        assert.equal(deps.adapter.schedule.firstCall.firstArg.time, retryAt.getTime());
    });

    it('warns about deliveries that have been sending for more than 10 minutes', async function () {
        const now = new Date('2026-08-06T12:00:00.000Z');
        sinon.useFakeTimers(now);
        const warn = sinon.stub(logging, 'warn');
        const deps = buildDeps();
        deps.countStuckDeliveries.resolves(2);
        const scheduler = new GiftDeliveryScheduler(deps);

        await scheduler.recoverAll();

        sinon.assert.calledOnceWithExactly(
            deps.countStuckDeliveries,
            new Date('2026-08-06T11:50:00.000Z')
        );
        sinon.assert.calledOnce(warn);
        sinon.assert.match(warn.firstCall.firstArg, {
            event: {name: 'gift_delivery_scheduler.stuck'},
            count: 2
        });
    });

    it('continues recovery when the stuck-delivery check fails', async function () {
        const error = new Error('database unavailable');
        const errorLog = sinon.stub(logging, 'error');
        const deps = buildDeps([
            {
                delivery: buildGiftDelivery(),
                availableAt: new Date(Date.now() - 60_000)
            }
        ]);
        deps.countStuckDeliveries.rejects(error);
        const scheduler = new GiftDeliveryScheduler(deps);

        await scheduler.recoverAll();

        sinon.assert.calledOnce(deps.wake);
        sinon.assert.calledOnce(errorLog);
        sinon.assert.match(errorLog.firstCall.firstArg, {
            event: {name: 'gift_delivery_scheduler.stuck_check.failed'},
            err: error
        });
    });
});
