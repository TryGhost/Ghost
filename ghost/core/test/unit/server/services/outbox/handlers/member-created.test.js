const assert = require('node:assert/strict');
const sinon = require('sinon');
const rewire = require('rewire');
const bunyan = require('bunyan');
const {PassThrough} = require('stream');
const logging = require('@tryghost/logging');

describe('member-created handler', function () {
    let handler;
    let memberWelcomeEmailServiceStub;
    let loggingStub;
    let AutomatedEmailStub;
    let AutomatedEmailRecipientStub;

    beforeEach(function () {
        handler = rewire('../../../../../../core/server/services/outbox/handlers/member-created.js');

        memberWelcomeEmailServiceStub = {
            api: {
                send: sinon.stub().resolves()
            }
        };

        loggingStub = {
            warn: sinon.stub(),
            error: sinon.stub()
        };

        AutomatedEmailStub = {
            findOne: sinon.stub().resolves({id: 'ae123'})
        };

        AutomatedEmailRecipientStub = {
            add: sinon.stub().resolves()
        };

        handler.__set__('memberWelcomeEmailService', memberWelcomeEmailServiceStub);
        handler.__set__('logging', loggingStub);
        handler.__set__('AutomatedEmail', AutomatedEmailStub);
        handler.__set__('AutomatedEmailRecipient', AutomatedEmailRecipientStub);
    });

    afterEach(function () {
        sinon.restore();
    });

    function captureLoggerOutput() {
        const output = [];
        const stream = new PassThrough();
        let buffered = '';

        stream.on('data', (chunk) => {
            buffered += chunk.toString();
            const lines = buffered.split('\n');
            buffered = lines.pop();

            for (const line of lines) {
                if (!line.trim()) {
                    continue;
                }

                output.push(JSON.parse(line));
            }
        });

        const originalStreams = logging.streams;
        logging.streams = {
            capture: {
                name: 'capture',
                log: bunyan.createLogger({
                    name: 'test-logger',
                    streams: [{
                        type: 'stream',
                        stream,
                        level: 'trace'
                    }]
                })
            }
        };

        return {
            output,
            restore() {
                logging.streams = originalStreams;
                stream.destroy();
            }
        };
    }

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
        sinon.assert.calledOnce(loggingStub.error);
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

        sinon.assert.calledOnce(loggingStub.error);
        const errorCall = loggingStub.error.getCall(0);
        assert.ok(errorCall.args[0].message.includes('Failed to track automated email send'));
        assert.equal(errorCall.args[0].err, dbError);
    });

    it('logs warning when status has no slug mapping', async function () {
        const capture = captureLoggerOutput();
        handler.__set__('logging', logging);

        try {
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
            const warningLog = capture.output.find(log => log.level === 40 && log.msg === 'No automated email slug found for member status');
            assert.ok(warningLog);
            assert.deepEqual(warningLog.system, {
                event: 'outbox.member_created.no_slug_mapping',
                member_status: 'comped'
            });
            sinon.assert.notCalled(AutomatedEmailRecipientStub.add);
        } finally {
            capture.restore();
        }
    });
});
