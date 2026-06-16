const assert = require('node:assert/strict');
const sinon = require('sinon');
const {captureLoggerOutput, findByEvent} = require('../../../../../utils/logging-utils');
const models = require('../../../../../../core/server/models');
const memberWelcomeEmailService = require('../../../../../../core/server/services/member-welcome-emails/service');
const handler = require('../../../../../../core/server/services/outbox/handlers/member-created');

describe('member-created handler', function () {
    let sendStub;
    let findOneStub;
    let addStub;
    let originalApi;
    let logCapture;

    beforeEach(function () {
        sendStub = sinon.stub().resolves();
        originalApi = memberWelcomeEmailService.api;
        memberWelcomeEmailService.api = {send: sendStub};

        findOneStub = sinon.stub(models.Automation, 'findOne').resolves({
            id: 'automation123',
            related: sinon.stub().callsFake((relation) => {
                if (relation === 'welcomeEmailAutomatedEmail') {
                    return {id: 'ae123'};
                }
            })
        });

        addStub = sinon.stub(models.AutomatedEmailRecipient, 'add').resolves();

        logCapture = captureLoggerOutput();
    });

    afterEach(function () {
        memberWelcomeEmailService.api = originalApi;
        logCapture.restore();
        sinon.restore();
    });

    it('sends email even when tracking fails', async function () {
        addStub.rejects(new Error('Database error'));

        await handler.handle({
            payload: {
                memberId: 'member123',
                uuid: 'uuid-123',
                email: 'test@example.com',
                name: 'Test Member',
                status: 'free'
            }
        });

        sinon.assert.calledOnce(sendStub);
    });

    it('logs error when tracking fails', async function () {
        const dbError = new Error('Database connection failed');
        addStub.rejects(dbError);

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

        sinon.assert.calledOnce(sendStub);
        const warningLog = findByEvent(logCapture.output, 'outbox.member_created.no_slug_mapping');
        assert.ok(warningLog);
        assert.deepEqual(warningLog.system, {
            event: 'outbox.member_created.no_slug_mapping',
            member_status: 'comped'
        });
        sinon.assert.notCalled(addStub);
    });

    it('logs warning when no automated email found for slug', async function () {
        findOneStub.resolves(null);

        await handler.handle({
            payload: {
                memberId: 'member123',
                uuid: 'uuid-123',
                email: 'test@example.com',
                name: 'Test Member',
                status: 'free'
            }
        });

        sinon.assert.calledOnce(sendStub);
        const warningLog = findByEvent(logCapture.output, 'outbox.member_created.no_automated_email');
        assert.ok(warningLog);
        assert.deepEqual(warningLog.system, {
            event: 'outbox.member_created.no_automated_email',
            slug: 'member-welcome-email-free'
        });
        sinon.assert.notCalled(addStub);
    });
});
