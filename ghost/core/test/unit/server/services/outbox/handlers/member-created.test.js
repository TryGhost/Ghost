const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');
const {captureLoggerOutput, findByEvent} = require('../../../../../utils/logging-utils');

describe('member-created handler', function () {
    let handler;
    let memberWelcomeEmailServiceStub;
    let AutomationStub;
    let AutomatedEmailRecipientStub;
    let MemberStub;
    let WelcomeEmailAutomationRunStub;
    let labsStub;
    let logCapture;

    beforeEach(function () {
        handler = rewire('../../../../../../core/server/services/outbox/handlers/member-created.js');

        memberWelcomeEmailServiceStub = {
            api: {
                send: sinon.stub().resolves()
            }
        };

        AutomationStub = {
            findOne: sinon.stub().resolves({
                id: 'automation123',
                related: sinon.stub().callsFake((relation) => {
                    if (relation === 'welcomeEmailAutomatedEmail') {
                        return {id: 'ae123'};
                    }
                })
            })
        };

        AutomatedEmailRecipientStub = {
            add: sinon.stub().resolves()
        };

        MemberStub = {
            findOne: sinon.stub().resolves({id: 'member123'})
        };

        WelcomeEmailAutomationRunStub = {
            add: sinon.stub().resolves({id: 'run123'}),
            edit: sinon.stub().resolves()
        };

        labsStub = {
            isSet: sinon.stub().withArgs('automations').returns(true)
        };

        logCapture = captureLoggerOutput();

        handler.__set__('memberWelcomeEmailService', memberWelcomeEmailServiceStub);
        handler.__set__('Automation', AutomationStub);
        handler.__set__('AutomatedEmailRecipient', AutomatedEmailRecipientStub);
        handler.__set__('Member', MemberStub);
        handler.__set__('WelcomeEmailAutomationRun', WelcomeEmailAutomationRunStub);
        handler.__set__('labs', labsStub);
    });

    afterEach(function () {
        logCapture.restore();
        sinon.restore();
    });

    it('sends email even when tracking fails', async function () {
        AutomatedEmailRecipientStub.add.rejects(new Error('Database error'));

        await handler.handle({
            payload: {
                memberId: 'member123',
                uuid: 'uuid-123',
                email: 'test@example.com',
                name: 'Test Member',
                status: 'free'
            }
        });

        sinon.assert.calledOnce(memberWelcomeEmailServiceStub.api.send);
    });

    it('passes an automation run id when sending welcome email', async function () {
        await handler.handle({
            payload: {
                memberId: 'member123',
                uuid: 'uuid-123',
                email: 'test@example.com',
                name: 'Test Member',
                status: 'free'
            }
        });

        sinon.assert.calledOnce(WelcomeEmailAutomationRunStub.add);
        sinon.assert.calledWith(memberWelcomeEmailServiceStub.api.send, sinon.match({
            runId: 'run123'
        }));
    });

    it('marks the automation run finished after tracking the recipient', async function () {
        await handler.handle({
            payload: {
                memberId: 'member123',
                uuid: 'uuid-123',
                email: 'test@example.com',
                name: 'Test Member',
                status: 'free'
            }
        });

        sinon.assert.calledOnceWithExactly(WelcomeEmailAutomationRunStub.edit, sinon.match({
            next_welcome_email_automated_email_id: null,
            ready_at: null,
            step_started_at: null,
            step_attempts: 0,
            exit_reason: 'finished'
        }), {id: 'run123'});
    });

    it('logs error when tracking fails', async function () {
        const dbError = new Error('Database connection failed');
        AutomatedEmailRecipientStub.add.rejects(dbError);

        await handler.handle({
            payload: {
                memberId: 'member123',
                uuid: 'uuid-123',
                email: 'test@example.com',
                name: 'Test Member',
                status: 'free'
            }
        });

        const errorLog = findByEvent(logCapture.output, 'outbox.member_created.track_send_failed');
        assert.ok(errorLog);
    });

    it('logs warning when status has no slug mapping', async function () {
        await handler.handle({
            payload: {
                memberId: 'member123',
                uuid: 'uuid-123',
                email: 'test@example.com',
                name: 'Test Member',
                status: 'comped'
            }
        });

        sinon.assert.calledOnce(memberWelcomeEmailServiceStub.api.send);
        const warningLog = findByEvent(logCapture.output, 'outbox.member_created.no_slug_mapping');
        assert.ok(warningLog);
        assert.deepEqual(warningLog.system, {
            event: 'outbox.member_created.no_slug_mapping',
            member_status: 'comped'
        });
        sinon.assert.notCalled(AutomatedEmailRecipientStub.add);
    });

    it('logs warning when no automated email found for slug', async function () {
        AutomationStub.findOne.resolves(null);

        await handler.handle({
            payload: {
                memberId: 'member123',
                uuid: 'uuid-123',
                email: 'test@example.com',
                name: 'Test Member',
                status: 'free'
            }
        });

        sinon.assert.calledOnce(memberWelcomeEmailServiceStub.api.send);
        const warningLog = findByEvent(logCapture.output, 'outbox.member_created.no_automated_email');
        assert.ok(warningLog);
        assert.deepEqual(warningLog.system, {
            event: 'outbox.member_created.no_automated_email',
            slug: 'member-welcome-email-free'
        });
        sinon.assert.notCalled(AutomatedEmailRecipientStub.add);
    });
});
