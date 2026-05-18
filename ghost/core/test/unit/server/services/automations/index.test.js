const sinon = require('sinon');

const AutomationsService = require('../../../../../core/server/services/automations');
const StartAutomationsPollEvent = require('../../../../../core/server/services/automations/events/start-automations-poll-event');

describe('AutomationsService', function () {
    let service;
    let domainEvents;
    let schedulerAdapter;
    let initOptions;

    beforeEach(function () {
        service = new AutomationsService();
        domainEvents = {
            dispatch: sinon.stub(),
            subscribe: sinon.stub()
        };
        schedulerAdapter = {
            schedule: sinon.stub()
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
            service.init(initOptions);

            sinon.assert.calledWith(domainEvents.dispatch, sinon.match.instanceOf(StartAutomationsPollEvent));
        });

        it('subscribes to StartAutomationsPollEvent', function () {
            service.init(initOptions);

            sinon.assert.calledOnceWithExactly(domainEvents.subscribe, StartAutomationsPollEvent, sinon.match.func);
        });

        it('subscribes only once when init is called multiple times', function () {
            service.init(initOptions);
            service.init(initOptions);

            sinon.assert.calledOnce(domainEvents.subscribe);
        });
    });
});
