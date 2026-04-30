const assert = require('node:assert/strict');
const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const models = require('../../../../core/server/models');
const automationsController = require('../../../../core/server/api/endpoints/automations');
const StartAutomationsPollEvent = require('../../../../core/server/services/welcome-email-automations/events/start-automations-poll-event');

describe('Automations controller', function () {
    before(function () {
        models.init();
    });

    function createMockAutomation(id, name, status) {
        return {
            get(key) {
                switch (key) {
                case 'id':
                    return id;
                case 'name':
                    return name;
                case 'status':
                    return status;
                default:
                    throw new Error(`Unexpected field: ${key}`);
                }
            }
        };
    }

    let dispatchStub;

    beforeEach(function () {
        sinon.stub(models.WelcomeEmailAutomation, 'findAll').resolves([
            createMockAutomation('automation-id-1', 'Welcome Email (Free)', 'active'),
            createMockAutomation('automation-id-2', 'Welcome Email (Premium)', 'inactive')
        ]);

        dispatchStub = sinon.stub(domainEvents, 'dispatch');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('browse', function () {
        it('returns only id, name, and status fields', async function () {
            const result = await automationsController.browse.query({});

            assert.deepEqual(result.data, [{
                id: 'automation-id-1',
                name: 'Welcome Email (Free)',
                status: 'active'
            }, {
                id: 'automation-id-2',
                name: 'Welcome Email (Premium)',
                status: 'inactive'
            }]);
        });
    });

    describe('poll', function () {
        it('dispatches a StartAutomationsPollEvent', function () {
            const result = automationsController.poll.query({});

            sinon.assert.calledOnceWithExactly(dispatchStub, sinon.match.instanceOf(StartAutomationsPollEvent));
            assert.equal(result, undefined);
        });
    });
});
