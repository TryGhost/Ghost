const sinon = require('sinon');

const StartAutomationsPollEvent = require('../../../../../core/server/services/automations/events/start-automations-poll-event');

const automationsModulePath = require.resolve('../../../../../core/server/services/automations');

describe('automations service', function () {
    let automations;
    let domainEvents;
    let schedulerAdapter;
    let initOptions;

    beforeEach(function () {
        // Reset the module-level singleton between tests.
        delete require.cache[automationsModulePath];
        automations = require(automationsModulePath);
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
