const assert = require('node:assert/strict');
const sinon = require('sinon');
const {captureLoggerOutput, findByEvent} = require('../../../../../utils/logging-utils');
const handler = require('../../../../../../core/server/services/outbox/handlers/member-created.js');
const memberWelcomeEmailService = require('../../../../../../core/server/services/member-welcome-emails/service');
const {Automation} = require('../../../../../../core/server/models/automation');
const {AutomatedEmailRecipient} = require('../../../../../../core/server/models/automated-email-recipient');

describe('member-created handler', function () {
    let memberWelcomeEmailServiceSendStub;
    let AutomationFindOneStub;
    let AutomatedEmailRecipientAddStub;
    let logCapture;
    let originalMemberWelcomeEmailApi;

    beforeEach(function () {
        memberWelcomeEmailServiceSendStub = sinon.stub().resolves();
        originalMemberWelcomeEmailApi = memberWelcomeEmailService.api;
        memberWelcomeEmailService.api = {
            send: memberWelcomeEmailServiceSendStub
        };

        AutomationFindOneStub = sinon.stub(Automation, 'findOne').resolves({
            id: 'automation123',
            related: sinon.stub().callsFake((relation) => {
                if (relation === 'welcomeEmailAutomatedEmail') {
                    return {id: 'ae123'};
                }
            })
        });

        AutomatedEmailRecipientAddStub = sinon.stub(AutomatedEmailRecipient, 'add').resolves();

        logCapture = captureLoggerOutput();
    });

    afterEach(function () {
        memberWelcomeEmailService.api = originalMemberWelcomeEmailApi;
        logCapture.restore();
        sinon.restore();
    });

    it('sends email even when tracking fails', async function () {
        AutomatedEmailRecipientAddStub.rejects(new Error('Database error'));

        await handler.handle({
            payload: {
                memberId: 'member123',
                uuid: 'uuid-123',
                email: 'test@example.com',
                name: 'Test Member',
                status: 'free'
            }
        });

        sinon.assert.calledOnce(memberWelcomeEmailServiceSendStub);
    });

    it('logs error when tracking fails', async function () {
        const dbError = new Error('Database connection failed');
        AutomatedEmailRecipientAddStub.rejects(dbError);

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

        sinon.assert.calledOnce(memberWelcomeEmailServiceSendStub);
        const warningLog = findByEvent(logCapture.output, 'outbox.member_created.no_slug_mapping');
        assert.ok(warningLog);
        assert.deepEqual(warningLog.system, {
            event: 'outbox.member_created.no_slug_mapping',
            member_status: 'comped'
        });
        sinon.assert.notCalled(AutomatedEmailRecipientAddStub);
    });

    it('logs warning when no automated email found for slug', async function () {
        AutomationFindOneStub.resolves(null);

        await handler.handle({
            payload: {
                memberId: 'member123',
                uuid: 'uuid-123',
                email: 'test@example.com',
                name: 'Test Member',
                status: 'free'
            }
        });

        sinon.assert.calledOnce(memberWelcomeEmailServiceSendStub);
        const warningLog = findByEvent(logCapture.output, 'outbox.member_created.no_automated_email');
        assert.ok(warningLog);
        assert.deepEqual(warningLog.system, {
            event: 'outbox.member_created.no_automated_email',
            slug: 'member-welcome-email-free'
        });
        sinon.assert.notCalled(AutomatedEmailRecipientAddStub);
    });
});
