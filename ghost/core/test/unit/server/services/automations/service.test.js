const sinon = require('sinon');
const rewire = require('rewire');
const DomainEvents = require('@tryghost/domain-events');

const StartAutomationsPollEvent = require('../../../../../core/server/services/automations/events/start-automations-poll-event');

const serviceModule = rewire('../../../../../core/server/services/automations/service');
const AutomationsService = serviceModule;

const eventLoop = () => Promise.resolve();
const nextEventLoopTurn = () => new Promise((resolve) => {
    setImmediate(resolve);
});
const defaultDomainEventsTrackingEnabled = process.env.NODE_ENV?.startsWith('test') || false;

describe('automations service', function () {
    let automations;
    let domainEvents;
    let schedulerAdapter;
    let initOptions;
    let restoreServiceDependencies;

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
        restoreServiceDependencies = [];
    });

    afterEach(function () {
        restoreServiceDependencies.forEach((restore) => {
            restore();
        });
        DomainEvents.ee.removeAllListeners(StartAutomationsPollEvent.name);
        DomainEvents.resetTrackingStateForTest();
        DomainEvents.setTrackingEnabledForTest(defaultDomainEventsTrackingEnabled);
        sinon.restore();
    });

    describe('init', function () {
        it('dispatches a StartAutomationsPollEvent', function () {
            automations.init(initOptions);
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

        it('subscribes awaitable poll handlers', async function () {
            const pollResult = Promise.withResolvers();
            const welcomeEmailPollResult = Promise.withResolvers();
            restoreServiceDependencies.push(
                serviceModule.__set__('poll', sinon.stub().returns(pollResult.promise)),
                serviceModule.__set__('welcomeEmailAutomationPoll', sinon.stub().returns(welcomeEmailPollResult.promise))
            );
            automations.init(initOptions);
            const [pollHandler, welcomeEmailPollHandler] = domainEvents.subscribe.getCalls().map(call => call.args[1]);
            const pollSettled = sinon.stub();
            const welcomeEmailPollSettled = sinon.stub();

            const pollPromise = pollHandler();
            const welcomeEmailPollPromise = welcomeEmailPollHandler();
            pollPromise.then(pollSettled);
            welcomeEmailPollPromise.then(welcomeEmailPollSettled);

            await eventLoop();
            sinon.assert.notCalled(pollSettled);
            sinon.assert.notCalled(welcomeEmailPollSettled);

            pollResult.resolve();
            welcomeEmailPollResult.resolve();
            await Promise.all([pollPromise, welcomeEmailPollPromise]);
            sinon.assert.calledOnce(pollSettled);
            sinon.assert.calledOnce(welcomeEmailPollSettled);
        });

        it('coalesces concurrent poll requests into an awaitable queued poll', async function () {
            const firstPoll = Promise.withResolvers();
            const queuedPoll = Promise.withResolvers();
            const poll = sinon.stub()
                .onFirstCall().returns(firstPoll.promise)
                .onSecondCall().returns(queuedPoll.promise);
            restoreServiceDependencies.push(
                serviceModule.__set__('poll', poll),
                serviceModule.__set__('welcomeEmailAutomationPoll', sinon.stub().resolves())
            );
            automations.init(initOptions);
            const pollHandler = domainEvents.subscribe.firstCall.args[1];
            const queuedPollSettled = sinon.stub();

            pollHandler();
            const queuedPollPromise = pollHandler();
            pollHandler();
            queuedPollPromise.then(queuedPollSettled);

            sinon.assert.calledOnce(poll);
            firstPoll.resolve();
            await nextEventLoopTurn();
            sinon.assert.calledTwice(poll);
            sinon.assert.notCalled(queuedPollSettled);

            queuedPoll.resolve();
            await queuedPollPromise;
            sinon.assert.calledOnce(queuedPollSettled);
            sinon.assert.calledTwice(poll);
        });

        it('keeps DomainEvents.allSettled pending until a queued poll settles', async function () {
            const firstPoll = Promise.withResolvers();
            const queuedPoll = Promise.withResolvers();
            const poll = sinon.stub()
                .onFirstCall().returns(firstPoll.promise)
                .onSecondCall().returns(queuedPoll.promise);
            restoreServiceDependencies.push(
                serviceModule.__set__('poll', poll),
                serviceModule.__set__('welcomeEmailAutomationPoll', sinon.stub().resolves())
            );
            DomainEvents.ee.removeAllListeners(StartAutomationsPollEvent.name);
            DomainEvents.setTrackingEnabledForTest(true);
            DomainEvents.resetTrackingStateForTest();
            automations.init({
                ...initOptions,
                domainEvents: DomainEvents
            });
            await nextEventLoopTurn();
            sinon.assert.calledOnce(poll);

            DomainEvents.dispatch(StartAutomationsPollEvent.create());
            const allSettledPromise = DomainEvents.allSettled();
            const allSettled = sinon.stub();
            allSettledPromise.then(allSettled);

            firstPoll.resolve();
            await nextEventLoopTurn();
            sinon.assert.calledTwice(poll);
            sinon.assert.notCalled(allSettled);

            queuedPoll.resolve();
            await allSettledPromise;
            sinon.assert.calledOnce(allSettled);
        });
    });

    describe('rescheduleAll', function () {
        it('dispatches a fresh StartAutomationsPollEvent', function () {
            automations.init(initOptions);
            domainEvents.dispatch.resetHistory();

            automations.rescheduleAll();

            sinon.assert.calledOnceWithExactly(
                domainEvents.dispatch,
                sinon.match.instanceOf(StartAutomationsPollEvent)
            );
        });

        it('is a no-op before init', function () {
            automations.rescheduleAll();
            sinon.assert.notCalled(domainEvents.dispatch);
        });
    });
});
