const sinon = require('sinon');

const WelcomeEmailAutomationsService = require('../../../../../core/server/services/welcome-email-automations');
const StartAutomationsPollEvent = require('../../../../../core/server/services/welcome-email-automations/events/start-automations-poll-event');

describe('WelcomeEmailAutomationsService', function () {
    let service;
    let domainEvents;
    let schedulerAdapter;
    let schedulerIntegration;
    let initOptions;

    beforeEach(function () {
        service = new WelcomeEmailAutomationsService();
        domainEvents = {
            dispatch: sinon.stub(),
            subscribe: sinon.stub()
        };
        schedulerAdapter = {
            schedule: sinon.stub()
        };
        schedulerIntegration = {
            api_keys: [{
                id: 'fake-key-id',
                secret: '00'.repeat(32)
            }]
        };
        initOptions = {
            domainEvents,
            apiUrl: 'https://fake.example.com/ghost/api/admin',
            schedulerAdapter,
            schedulerIntegration
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
