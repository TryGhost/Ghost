const sinon = require('sinon');

const WelcomeEmailAutomationsService = require('../../../../../core/server/services/welcome-email-automations');
const StartAutomationsPollEvent = require('../../../../../core/server/services/welcome-email-automations/events/start-automations-poll-event');

describe('WelcomeEmailAutomationsService', function () {
    let service;
    let domainEvents;

    beforeEach(function () {
        service = new WelcomeEmailAutomationsService();
        domainEvents = {
            dispatch: sinon.stub(),
            subscribe: sinon.stub()
        };
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('init', function () {
        it('dispatches a StartAutomationsPollEvent', function () {
            service.init(domainEvents);

            sinon.assert.calledWith(domainEvents.dispatch, sinon.match.instanceOf(StartAutomationsPollEvent));
        });

        it('subscribes to StartAutomationsPollEvent', function () {
            service.init(domainEvents);

            sinon.assert.calledOnceWithExactly(domainEvents.subscribe, StartAutomationsPollEvent, sinon.match.func);
        });

        it('subscribes only once when init is called multiple times', function () {
            service.init(domainEvents);
            service.init(domainEvents);

            sinon.assert.calledOnce(domainEvents.subscribe);
        });
    });
});
