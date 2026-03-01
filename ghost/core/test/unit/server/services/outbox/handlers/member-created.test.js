const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');
const {captureLoggerOutput, findByEvent} = require('../../../../../utils/logging-utils');

describe('member-created handler', function () {
    let handler;
    let memberWelcomeEmailServiceStub;
    let AutomatedEmailStub;
    let AutomatedEmailRecipientStub;
    let logCapture;

    beforeEach(function () {
        handler = rewire('../../../../../../core/server/services/outbox/handlers/member-created.js');

        memberWelcomeEmailServiceStub = {
            api: {
                send: sinon.stub().resolves()
            }
        };

        AutomatedEmailStub = {
            findOne: sinon.stub().resolves({id: 'ae123'})
        };

        AutomatedEmailRecipientStub = {
            add: sinon.stub().resolves()
        };

        logCapture = captureLoggerOutput();

        handler.__set__('memberWelcomeEmailService', memberWelcomeEmailServiceStub);
        handler.__set__('AutomatedEmail', AutomatedEmailStub);
        handler.__set__('AutomatedEmailRecipient', AutomatedEmailRecipientStub);
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
});
