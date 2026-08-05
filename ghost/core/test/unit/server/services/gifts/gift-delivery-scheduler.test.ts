import assert from 'node:assert/strict';
import sinon from 'sinon';
import {GiftDeliveryScheduler} from '../../../../../core/server/services/gifts/gift-delivery-scheduler';
import {AutoFillingMap} from '../../../../../core/server/lib/auto-filling-map';
import type {InternalApiKey, InternalIntegrationSlug} from '../../../../../core/server/services/internal-keys';
import type {Gift} from '../../../../../core/server/services/gifts/gift';
import {buildGift} from './utils';

const KEY: InternalApiKey = {id: 'kid', secret: 'aa'.repeat(32)};

function buildDeps(pending: Gift[] = []) {
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
        wake: sinon.stub()
    };
}

describe('GiftDeliveryScheduler', function () {
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
            buildGift({deliveryMethod: 'email', recipientEmail: 'now@example.com'}),
            buildGift({
                token: 'future-gift',
                deliveryMethod: 'email',
                recipientEmail: 'future@example.com',
                deliveryNextAttemptAt: retryAt
            })
        ]);
        const scheduler = new GiftDeliveryScheduler(deps);

        await scheduler.recoverAll();

        sinon.assert.calledOnce(deps.wake);
        sinon.assert.calledOnce(deps.adapter.unschedule);
        sinon.assert.calledOnce(deps.adapter.schedule);
        assert.equal(deps.adapter.schedule.firstCall.firstArg.time, retryAt.getTime());
    });
});
