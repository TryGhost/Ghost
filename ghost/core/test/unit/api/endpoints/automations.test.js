const assert = require('node:assert/strict');
const sinon = require('sinon');
const domainEvents = require('@tryghost/domain-events');
const models = require('../../../../core/server/models');
const automationsController = require('../../../../core/server/api/endpoints/automations');
const StartAutomationsPollEvent = require('../../../../core/server/services/automations/events/start-automations-poll-event');

describe('Automations controller', function () {
    before(function () {
        models.init();
    });

    function createMockAutomation(id, name, slug, status) {
        return {
            get(key) {
                switch (key) {
                case 'id':
                    return id;
                case 'name':
                    return name;
                case 'slug':
                    return slug;
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
            createMockAutomation('automation-id-1', 'Welcome Email (Free)', 'member-welcome-email-free', 'active'),
            createMockAutomation('automation-id-2', 'Welcome Email (Premium)', 'member-welcome-email-premium', 'inactive')
        ]);

        dispatchStub = sinon.stub(domainEvents, 'dispatch');
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('browse', function () {
        it('returns only id, name, slug, and status fields', async function () {
            const result = await automationsController.browse.query({});

            assert.deepEqual(result.data, [{
                id: 'automation-id-1',
                name: 'Welcome Email (Free)',
                slug: 'member-welcome-email-free',
                status: 'active'
            }, {
                id: 'automation-id-2',
                name: 'Welcome Email (Premium)',
                slug: 'member-welcome-email-premium',
                status: 'inactive'
            }]);
        });
    });

    describe('read', function () {
        it('returns a placeholder automation for the requested id', function () {
            const result = automationsController.read.query({
                data: {
                    id: '67f3f3f3f3f3f3f3f3f3f3f3'
                }
            });

            assert.deepEqual(result, {
                id: '67f3f3f3f3f3f3f3f3f3f3f3',
                slug: 'member-welcome-email-free',
                name: 'Welcome email',
                status: 'active',
                created_at: '2026-05-05T00:00:00.000Z',
                updated_at: '2026-05-05T00:00:00.000Z',
                actions: [{
                    id: '67f3f3f3f3f3f3f3f3f3f3f4',
                    type: 'delay',
                    data: {
                        delay_hours: 24
                    }
                }, {
                    id: '67f3f3f3f3f3f3f3f3f3f3f5',
                    type: 'send email',
                    data: {
                        email_subject: 'Welcome!',
                        email_lexical: '{"root":{"children":[]}}',
                        email_sender_name: null,
                        email_sender_email: null,
                        email_sender_reply_to: null,
                        email_design_setting_id: '680000000000000000000001'
                    }
                }],
                edges: [{
                    source_action_id: '67f3f3f3f3f3f3f3f3f3f3f4',
                    target_action_id: '67f3f3f3f3f3f3f3f3f3f3f5'
                }]
            });
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
