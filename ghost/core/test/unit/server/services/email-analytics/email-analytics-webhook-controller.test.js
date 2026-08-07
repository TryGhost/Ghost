const assert = require('node:assert/strict');
const sinon = require('sinon');
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

describe('UNIT: EmailAnalyticsWebhookController', function () {
    it('responds 501 when no email adapter is configured', async function () {
        const adapterManager = {getAdapter: sinon.stub().throws(new Error('no adapter configured'))};
        const emailEventProcessor = {handleDelivered: sinon.stub()};
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor});
        const res = fakeResponse();

        await controller.handle({}, res);

        assert.equal(res.statusCode, 501);
        assert.ok(res.ended);
    });

    it('responds 501 when the adapter does not implement webhook ingestion', async function () {
        const adapterManager = {getAdapter: () => ({send: async () => {}})};
        const emailEventProcessor = {handleDelivered: sinon.stub()};
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor});
        const res = fakeResponse();

        await controller.handle({}, res);

        assert.equal(res.statusCode, 501);
    });

    it('responds 401 when the adapter rejects the request signature', async function () {
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(false),
            parseWebhookEvents: sinon.stub()
        };
        const adapterManager = {getAdapter: () => adapter};
        const emailEventProcessor = {handleDelivered: sinon.stub()};
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor});
        const res = fakeResponse();

        await controller.handle({}, res);

        assert.equal(res.statusCode, 401);
        assert.ok(adapter.parseWebhookEvents.notCalled);
    });

    it('normalizes and forwards each event type to EmailEventProcessor', async function () {
        const timestamp = new Date();
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(true),
            parseWebhookEvents: sinon.stub().returns([
                {type: 'delivered', email: 'a@example.com', providerId: 'p1', timestamp},
                {type: 'opened', email: 'a@example.com', providerId: 'p1', timestamp},
                {type: 'permanent_failed', email: 'b@example.com', providerId: 'p2', timestamp, error: {code: 550, message: 'bounced'}},
                {type: 'temporary_failed', email: 'b@example.com', providerId: 'p2', timestamp, error: {code: 421, message: 'deferred'}},
                {type: 'unsubscribed', email: 'c@example.com', providerId: 'p3', timestamp},
                {type: 'complained', email: 'd@example.com', providerId: 'p4', timestamp}
            ])
        };
        const adapterManager = {getAdapter: () => adapter};
        const emailEventProcessor = {
            handleDelivered: sinon.stub(),
            handleOpened: sinon.stub(),
            handlePermanentFailed: sinon.stub(),
            handleTemporaryFailed: sinon.stub(),
            handleUnsubscribed: sinon.stub(),
            handleComplained: sinon.stub()
        };
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor});
        const res = fakeResponse();

        await controller.handle({}, res);

        assert.equal(res.statusCode, 200);
        assert.ok(emailEventProcessor.handleDelivered.calledOnceWith({email: 'a@example.com', providerId: 'p1'}, timestamp));
        assert.ok(emailEventProcessor.handleOpened.calledOnceWith({email: 'a@example.com', providerId: 'p1'}, timestamp));
        assert.ok(emailEventProcessor.handlePermanentFailed.calledOnceWith(
            {email: 'b@example.com', providerId: 'p2'},
            {id: 'p2', timestamp, error: {code: 550, message: 'bounced'}}
        ));
        assert.ok(emailEventProcessor.handleTemporaryFailed.calledOnceWith(
            {email: 'b@example.com', providerId: 'p2'},
            {id: 'p2', timestamp, error: {code: 421, message: 'deferred'}}
        ));
        assert.ok(emailEventProcessor.handleUnsubscribed.calledOnceWith({email: 'c@example.com', providerId: 'p3'}, timestamp));
        assert.ok(emailEventProcessor.handleComplained.calledOnceWith({email: 'd@example.com', providerId: 'p4'}, timestamp));
    });

    it('keeps processing remaining events when one event handler throws', async function () {
        const timestamp = new Date();
        const adapter = {
            verifyWebhookRequest: sinon.stub().returns(true),
            parseWebhookEvents: sinon.stub().returns([
                {type: 'delivered', email: 'a@example.com', providerId: 'p1', timestamp},
                {type: 'opened', email: 'a@example.com', providerId: 'p1', timestamp}
            ])
        };
        const adapterManager = {getAdapter: () => adapter};
        const emailEventProcessor = {
            handleDelivered: sinon.stub().rejects(new Error('db down')),
            handleOpened: sinon.stub()
        };
        const controller = new EmailAnalyticsWebhookController({adapterManager, emailEventProcessor});
        const res = fakeResponse();

        await controller.handle({}, res);

        assert.equal(res.statusCode, 200);
        assert.ok(emailEventProcessor.handleOpened.calledOnce);
    });
});
