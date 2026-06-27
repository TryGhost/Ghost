const assert = require('node:assert/strict');
const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const automationsController = require('../../../../core/server/api/endpoints/automations');
const StartAutomationsPollEvent = require('../../../../core/server/services/automations/events/start-automations-poll-event');

describe('Automations controller', function () {
    // Other endpoints are tested in E2E tests.

    let dispatchStub;

    beforeEach(function () {
        dispatchStub = sinon.stub(domainEvents, 'dispatch');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('poll', function () {
        it('dispatches a StartAutomationsPollEvent', function () {
            const result = automationsController.poll.query({});

            sinon.assert.calledOnceWithExactly(dispatchStub, sinon.match.instanceOf(StartAutomationsPollEvent));

            // The Ghost(Pro) Scheduler requires a 200 with a JSON object body; an empty
            // response is treated as a failed job and retried.
            assert.equal(automationsController.poll.statusCode, 200);
            assert.equal(typeof result, 'object');
            assert.notEqual(result, null);
        });
    });
});
