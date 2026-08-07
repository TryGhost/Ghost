const assert = require('node:assert/strict');
const sinon = require('sinon');
const configUtils = require('../../../../utils/config-utils');
const EmailAnalyticsWebhookController = require('../../../../../core/server/services/email-analytics/email-analytics-webhook-controller');

function fakeResponse() {
    return {
        statusCode: null,
        ended: false,
        writeHead(code) {
            this.statusCode = code;
        },
        end() {
            this.ended = true;
        }
    };
}

function fakeRequest(body = Buffer.from('{}')) {
    return {body};
}

function fakeEmailEventProcessor(overrides = {}) {
    return Object.assign({
        batchGetRecipients: sinon.stub().resolves(new Map()),
        flushBatchedUpdates: sinon.stub().resolves(),
        handleDelivered: sinon.stub().resolves({emailRecipientId: 'er1', memberId: 'm1', emailId: 'e1'}),
        handleOpened: sinon.stub().resolves({emailRecipientId: 'er1', memberId: 'm1', emailId: 'e1'}),
        handlePermanentFailed: sinon.stub().resolves({emailRecipientId: 'er1', memberId: 'm1', emailId: 'e1'}),
        handleTemporaryFailed: sinon.stub().resolves({emailRecipientId: 'er1', memberId: 'm1', emailId: 'e1'}),
        handleUnsubscribed: sinon.stub().resolves({emailRecipientId: 'er1', memberId: 'm1', emailId: 'e1'}),
        handleComplained: sinon.stub().resolves({emailRecipientId: 'er1', memberId: 'm1', emailId: 'e1'})
    }, overrides);
}

describe('UNIT: EmailAnalyticsWebhookController', function () {
    afterEach(function () {
        configUtils.restore();
    });

    it('responds 501 when no email adapter is configured', async function () {
        configUtils.set('adapters:email:active', undefined);
        const adapterManager = {getAdapter: sinon.stub().throws(new Error('should not be called'))};
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor: fakeEmailEventProcessor()});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 501);
        assert.ok(res.ended);
        assert.ok(adapterManager.getAdapter.notCalled);
    });

    it('responds 500 and logs when a configured adapter fails to load', async function () {
        configUtils.set('adapters:email:active', 'SomeBrokenAdapter');
        const adapterManager = {getAdapter: sinon.stub().throws(new Error('failed to load class'))};
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor: fakeEmailEventProcessor()});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 500);
    });

    it('responds 501 when the adapter does not implement webhook ingestion', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const adapterManager = {getAdapter: () => ({send: async () => {}})};
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor: fakeEmailEventProcessor()});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 501);
    });

    it('responds 400 when the request has no body', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(true),
            parseWebhookEvents: sinon.stub()
        };
        const adapterManager = {getAdapter: () => adapter};
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor: fakeEmailEventProcessor()});
        const res = fakeResponse();

        await controller.handle(fakeRequest(Buffer.alloc(0)), res);

        assert.equal(res.statusCode, 400);
        assert.ok(adapter.verifyWebhookRequest.notCalled);
    });

    it('responds 401 when the adapter rejects the request signature', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(false),
            parseWebhookEvents: sinon.stub()
        };
        const adapterManager = {getAdapter: () => adapter};
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor: fakeEmailEventProcessor()});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 401);
        assert.ok(adapter.parseWebhookEvents.notCalled);
    });

    it('responds 401 when verifyWebhookRequest rejects', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const adapter = {
            verifyWebhookRequest: sinon.stub().rejects(new Error('bad signature')),
            parseWebhookEvents: sinon.stub()
        };
        const adapterManager = {getAdapter: () => adapter};
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor: fakeEmailEventProcessor()});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 401);
        assert.ok(adapter.parseWebhookEvents.notCalled);
    });

    it('responds 400 when parseWebhookEvents throws', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(true),
            parseWebhookEvents: sinon.stub().rejects(new Error('bad payload'))
        };
        const adapterManager = {getAdapter: () => adapter};
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor: fakeEmailEventProcessor()});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 400);
    });

    it('responds 400 when parseWebhookEvents returns a non-array', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(true),
            parseWebhookEvents: sinon.stub().returns({Records: []})
        };
        const adapterManager = {getAdapter: () => adapter};
        const emailEventProcessor = fakeEmailEventProcessor();
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 400);
        assert.ok(res.ended);
        assert.ok(emailEventProcessor.batchGetRecipients.notCalled);
    });

    it('responds 200 for an empty events array', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(true),
            parseWebhookEvents: sinon.stub().returns([])
        };
        const adapterManager = {getAdapter: () => adapter};
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor: fakeEmailEventProcessor()});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 200);
    });

    it('discards malformed events before they reach the processor', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const timestamp = new Date();
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(true),
            parseWebhookEvents: sinon.stub().returns([
                {type: 'delivered', email: 'a@example.com', providerId: 'p1', timestamp},
                {type: 'delivered', providerId: 'p2', timestamp}, // missing email
                {type: 'delivered', email: 'c@example.com', providerId: 'p3'}, // missing timestamp
                null
            ])
        };
        const adapterManager = {getAdapter: () => adapter};
        const emailEventProcessor = fakeEmailEventProcessor();
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 200);
        assert.ok(emailEventProcessor.handleDelivered.calledOnce);
    });

    it('normalizes and forwards each event type to EmailEventProcessor, and flushes batched updates', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const timestamp = new Date();
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(true),
            parseWebhookEvents: sinon.stub().returns([
                {type: 'delivered', email: 'a@example.com', providerId: 'p1', timestamp},
                {type: 'opened', email: 'a@example.com', providerId: 'p1', timestamp},
                {type: 'permanent_failed', email: 'b@example.com', providerId: 'p2', timestamp, error: {code: 550, message: 'bounced'}},
                {type: 'temporary_failed', email: 'b@example.com', providerId: 'p2', timestamp, error: {code: 421, message: 'deferred'}},
                {type: 'unsubscribed', email: 'c@example.com', providerId: 'p3', timestamp},
                {type: 'complained', email: 'd@example.com', emailId: 'e4', timestamp}
            ])
        };
        const adapterManager = {getAdapter: () => adapter};
        const emailEventProcessor = fakeEmailEventProcessor();
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 200);
        assert.ok(emailEventProcessor.handleDelivered.calledOnceWith({email: 'a@example.com', emailId: undefined, providerId: 'p1'}, timestamp, sinon.match.instanceOf(Map)));
        assert.ok(emailEventProcessor.handleOpened.calledOnceWith({email: 'a@example.com', emailId: undefined, providerId: 'p1'}, timestamp, sinon.match.instanceOf(Map)));
        assert.ok(emailEventProcessor.handlePermanentFailed.calledOnceWith(
            {email: 'b@example.com', emailId: undefined, providerId: 'p2'},
            {id: 'p2', timestamp, error: {code: 550, message: 'bounced'}},
            sinon.match.instanceOf(Map)
        ));
        assert.ok(emailEventProcessor.handleTemporaryFailed.calledOnceWith(
            {email: 'b@example.com', emailId: undefined, providerId: 'p2'},
            {id: 'p2', timestamp, error: {code: 421, message: 'deferred'}},
            sinon.match.instanceOf(Map)
        ));
        assert.ok(emailEventProcessor.handleUnsubscribed.calledOnceWith({email: 'c@example.com', emailId: undefined, providerId: 'p3'}, timestamp, sinon.match.instanceOf(Map)));
        assert.ok(emailEventProcessor.handleComplained.calledOnceWith({email: 'd@example.com', emailId: 'e4', providerId: undefined}, timestamp, sinon.match.instanceOf(Map)));
        assert.ok(emailEventProcessor.batchGetRecipients.calledOnce);
        assert.ok(emailEventProcessor.flushBatchedUpdates.calledOnce);
    });

    it('coerces a string timestamp to a Date before forwarding', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(true),
            parseWebhookEvents: sinon.stub().returns([
                {type: 'delivered', email: 'a@example.com', providerId: 'p1', timestamp: '2024-01-01T00:00:00.000Z'}
            ])
        };
        const adapterManager = {getAdapter: () => adapter};
        const emailEventProcessor = fakeEmailEventProcessor();
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 200);
        const [, forwardedTimestamp] = emailEventProcessor.handleDelivered.firstCall.args;
        assert.ok(forwardedTimestamp instanceof Date);
        assert.equal(forwardedTimestamp.toISOString(), '2024-01-01T00:00:00.000Z');
    });

    it('ignores unknown event types but still answers 200', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const timestamp = new Date();
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(true),
            parseWebhookEvents: sinon.stub().returns([
                {type: 'clicked', email: 'a@example.com', providerId: 'p1', timestamp}
            ])
        };
        const adapterManager = {getAdapter: () => adapter};
        const emailEventProcessor = fakeEmailEventProcessor();
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 200);
        assert.ok(emailEventProcessor.handleDelivered.notCalled);
    });

    it('still answers 200 when a recipient cannot be resolved (logged, not failed)', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const timestamp = new Date();
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(true),
            parseWebhookEvents: sinon.stub().returns([
                {type: 'delivered', email: 'a@example.com', providerId: 'unknown-provider-id', timestamp}
            ])
        };
        const adapterManager = {getAdapter: () => adapter};
        const emailEventProcessor = fakeEmailEventProcessor({handleDelivered: sinon.stub().resolves(undefined)});
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 200);
    });

    it('keeps processing remaining events when one event handler throws, and responds 500', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const timestamp = new Date();
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(true),
            parseWebhookEvents: sinon.stub().returns([
                {type: 'delivered', email: 'a@example.com', providerId: 'p1', timestamp},
                {type: 'opened', email: 'a@example.com', providerId: 'p1', timestamp}
            ])
        };
        const adapterManager = {getAdapter: () => adapter};
        const emailEventProcessor = fakeEmailEventProcessor({handleDelivered: sinon.stub().rejects(new Error('db down'))});
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 500);
        assert.ok(emailEventProcessor.handleOpened.calledOnce);
    });

    it('responds 500 when flushing batched updates fails', async function () {
        configUtils.set('adapters:email:active', 'SomeAdapter');
        const timestamp = new Date();
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(true),
            parseWebhookEvents: sinon.stub().returns([
                {type: 'delivered', email: 'a@example.com', providerId: 'p1', timestamp}
            ])
        };
        const adapterManager = {getAdapter: () => adapter};
        const emailEventProcessor = fakeEmailEventProcessor({flushBatchedUpdates: sinon.stub().rejects(new Error('flush failed'))});
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor});
        const res = fakeResponse();

        await controller.handle(fakeRequest(), res);

        assert.equal(res.statusCode, 500);
    });
});
