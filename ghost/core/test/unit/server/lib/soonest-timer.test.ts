import sinon from 'sinon';
import {SoonestTimer} from '../../../../core/server/lib/soonest-timer';

describe('SoonestTimer', function () {
    let clock: sinon.SinonFakeTimers;
    let callback: sinon.SinonStub;

    beforeEach(function () {
        clock = sinon.useFakeTimers(new Date('2026-01-01T00:00:00.000Z').getTime());
        callback = sinon.stub();
    });

    afterEach(function () {
        sinon.restore();
    });

    it('runs the callback when the scheduled date arrives', async function () {
        const timer = new SoonestTimer(callback);

        timer.scheduleAt(new Date(Date.now() + 1000));
        await clock.tickAsync(999);

        sinon.assert.notCalled(callback);

        await clock.tickAsync(1);

        sinon.assert.calledOnceWithExactly(callback);
    });

    it('can run a callback scheduled far in the future', async function () {
        const timer = new SoonestTimer(callback);
        const thirtyDays = 30 * 24 * 60 * 60 * 1000;

        timer.scheduleAt(new Date(Date.now() + thirtyDays));
        await clock.tickAsync(thirtyDays - 1);

        sinon.assert.notCalled(callback);

        await clock.tickAsync(1);

        sinon.assert.calledOnceWithExactly(callback);
    });

    it('replaces a scheduled callback when the new date is sooner', async function () {
        const timer = new SoonestTimer(callback);

        timer.scheduleAt(new Date(Date.now() + 10_000));
        timer.scheduleAt(new Date(Date.now() + 5000));
        await clock.tickAsync(4999);

        sinon.assert.notCalled(callback);

        await clock.tickAsync(1);

        sinon.assert.calledOnceWithExactly(callback);

        await clock.tickAsync(5000);

        sinon.assert.calledOnce(callback);
    });

    it('keeps the scheduled callback when the new date is later', async function () {
        const timer = new SoonestTimer(callback);

        timer.scheduleAt(new Date(Date.now() + 5000));
        timer.scheduleAt(new Date(Date.now() + 10_000));
        await clock.tickAsync(4999);

        sinon.assert.notCalled(callback);

        await clock.tickAsync(1);

        sinon.assert.calledOnceWithExactly(callback);

        await clock.tickAsync(5000);

        sinon.assert.calledOnce(callback);
    });
});
