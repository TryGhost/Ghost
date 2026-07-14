const sinon = require('sinon');
const {setImmediate: flushEventLoop} = require('node:timers/promises');

const StartAutomationsPollEvent = require('../../../../../core/server/services/automations/events/start-automations-poll-event');
const {AutomationsService} = require('../../../../../core/server/services/automations/service');

describe('automations service', function () {
    let automations;
    let domainEvents;
    let schedulerAdapter;
    let initOptions;

    beforeEach(function () {
        automations = new AutomationsService();
        domainEvents = {
            dispatch: sinon.stub(),
            subscribe: sinon.stub()
        };
        schedulerAdapter = {
            schedule: sinon.stub(),
            register: sinon.stub()
        };
        initOptions = {
            domainEvents,
            apiUrl: 'https://fake.example.com/ghost/api/admin',
            schedulerAdapter,
            internalKeys: new Map([
                ['ghost-scheduler', Promise.resolve({id: 'k1', secret: 'aaaa'})]
            ])
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('init', function () {
        it('dispatches a StartAutomationsPollEvent', async function () {
            automations.init(initOptions);
            await flushEventLoop();
            sinon.assert.calledWith(domainEvents.dispatch, sinon.match.instanceOf(StartAutomationsPollEvent));
        });

        it('subscribes to StartAutomationsPollEvent', function () {
            automations.init(initOptions);
            sinon.assert.called(domainEvents.subscribe);
            sinon.assert.alwaysCalledWith(domainEvents.subscribe, StartAutomationsPollEvent, sinon.match.func);
        });

        it('subscribes each poller only once when init is called multiple times', function () {
            automations.init(initOptions);
            automations.init(initOptions);
            automations.init(initOptions);
            automations.init(initOptions);
            sinon.assert.calledTwice(domainEvents.subscribe);
        });
    });

    describe('enqueueing poll', function () {
        beforeEach(async function () {
            automations.init(initOptions);
            await flushEventLoop();
            domainEvents.dispatch.resetHistory();
        });

        it('dispatches a StartAutomationsPollEvent if date is in the past', async function () {
            const past = new Date(Date.now() - 1000);
            await automations.__testOnlyEnqueuePollAt(past);

            sinon.assert.calledOnceWithExactly(
                domainEvents.dispatch,
                sinon.match.instanceOf(StartAutomationsPollEvent)
            );

            sinon.assert.notCalled(schedulerAdapter.schedule);
        });

        it('dispatches a StartAutomationsPollEvent if date is now', async function () {
            const now = new Date('2026-01-01T00:00:00.000Z');
            sinon.useFakeTimers({now, toFake: ['Date']});

            await automations.__testOnlyEnqueuePollAt(now);

            sinon.assert.calledOnceWithExactly(
                domainEvents.dispatch,
                sinon.match.instanceOf(StartAutomationsPollEvent)
            );

            sinon.assert.notCalled(schedulerAdapter.schedule);
        });

        it('schedules an in-memory timer if date is in the future', async function () {
            const clock = sinon.useFakeTimers(new Date('2026-01-01T00:00:00.000Z').getTime());
            const future = new Date(Date.now() + 1000);

            await automations.__testOnlyEnqueuePollAt(future);
            await clock.tickAsync(999);

            sinon.assert.notCalled(domainEvents.dispatch);

            await clock.tickAsync(1);

            sinon.assert.calledOnceWithExactly(
                domainEvents.dispatch,
                sinon.match.instanceOf(StartAutomationsPollEvent)
            );
        });

        it('can schedule a timer for far in the future, avoiding setTimeout limits', async function () {
            const clock = sinon.useFakeTimers(new Date('2026-01-01T00:00:00.000Z').getTime());
            const thirtyDays = 30 * 24 * 60 * 60 * 1000;
            const future = new Date(Date.now() + thirtyDays);

            await automations.__testOnlyEnqueuePollAt(future);

            await clock.tickAsync(thirtyDays - 1);

            sinon.assert.notCalled(domainEvents.dispatch);

            await clock.tickAsync(1);

            sinon.assert.calledOnceWithExactly(
                domainEvents.dispatch,
                sinon.match.instanceOf(StartAutomationsPollEvent)
            );
        });

        it('cancels future in-memory timers if the date is sooner than the previous date', async function () {
            const clock = sinon.useFakeTimers(new Date('2026-01-01T00:00:00.000Z').getTime());
            const later = new Date(Date.now() + 10_000);
            const sooner = new Date(Date.now() + 5000);

            await automations.__testOnlyEnqueuePollAt(later);
            await automations.__testOnlyEnqueuePollAt(sooner);
            await clock.tickAsync(4999);

            sinon.assert.notCalled(domainEvents.dispatch);

            await clock.tickAsync(1);

            sinon.assert.calledOnceWithExactly(
                domainEvents.dispatch,
                sinon.match.instanceOf(StartAutomationsPollEvent)
            );

            await clock.tickAsync(5000);

            sinon.assert.calledOnce(domainEvents.dispatch);
        });

        it('doesn\'t cancel future in-memory timers if the date is later than a previous date', async function () {
            const clock = sinon.useFakeTimers(new Date('2026-01-01T00:00:00.000Z').getTime());
            const sooner = new Date(Date.now() + 5000);
            const later = new Date(Date.now() + 10_000);

            await automations.__testOnlyEnqueuePollAt(sooner);
            await automations.__testOnlyEnqueuePollAt(later);
            await clock.tickAsync(4999);

            sinon.assert.notCalled(domainEvents.dispatch);

            await clock.tickAsync(1);

            sinon.assert.calledOnceWithExactly(
                domainEvents.dispatch,
                sinon.match.instanceOf(StartAutomationsPollEvent)
            );

            await clock.tickAsync(5000);

            sinon.assert.calledOnce(domainEvents.dispatch);
        });

        it('reaches out to the scheduler for dates in the future', async function () {
            const future = new Date(Date.now() + 10_000);
            await automations.__testOnlyEnqueuePollAt(future);

            sinon.assert.calledOnceWithExactly(
                schedulerAdapter.schedule,
                sinon.match({
                    time: future.getTime(),
                    url: sinon.match((value) => (
                        typeof value === 'string' &&
                        new URL(value).searchParams.has('token')
                    )),
                    extra: {
                        httpMethod: 'PUT'
                    }
                })
            );

            sinon.assert.neverCalledWith(
                domainEvents.dispatch,
                sinon.match.instanceOf(StartAutomationsPollEvent)
            );
        });
    });

    describe('rescheduleAll', function () {
        it('dispatches a fresh StartAutomationsPollEvent', async function () {
            automations.init(initOptions);
            await flushEventLoop();
            domainEvents.dispatch.resetHistory();

            await automations.rescheduleAll();

            sinon.assert.calledOnceWithExactly(
                domainEvents.dispatch,
                sinon.match.instanceOf(StartAutomationsPollEvent)
            );
        });

        it('is a no-op before init', async function () {
            await automations.rescheduleAll();
            sinon.assert.notCalled(domainEvents.dispatch);
        });
    });
});
