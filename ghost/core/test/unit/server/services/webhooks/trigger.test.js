const assert = require('node:assert/strict');
const crypto = require('crypto');
const sinon = require('sinon');
const logging = require('@tryghost/logging');
const LimitService = require('@tryghost/limit-service');

const WebhookTrigger = require('../../../../../core/server/services/webhooks/webhook-trigger');

const SIGNATURE_HEADER = 'X-Ghost-Signature';
const SIGNATURE_REGEX = /^sha256=[a-z0-9]+, t=\d+$/;

describe('Webhook Service', function () {
    const WEBHOOK_EVENT = 'post.added';
    const WEBHOOK_TARGET_URL = 'http://example.com';
    const WEBHOOK_SECRET = 'abc123dontstealme';

    let models, payload, request, webhookTrigger, limitService;

    beforeEach(function () {
        models = {
            Webhook: {
                edit: sinon.stub(),
                destroy: sinon.stub(),
                findAllByEvent: sinon.stub(),
                getByEventAndTarget: sinon.stub(),
                add: sinon.stub()
            }
        };

        models.Webhook.edit.resolves(null);
        models.Webhook.destroy.resolves(null);
        models.Webhook.findAllByEvent.resolves(null);
        models.Webhook.getByEventAndTarget.resolves(null);
        models.Webhook.add.resolves(null);

        payload = sinon.stub();
        request = sinon.stub().resolves({});

        const realLimitService = new LimitService();
        limitService = sinon.stub(realLimitService);
        limitService.isLimited.withArgs('customIntegrations').returns(false);
        limitService.checkWouldGoOverLimit.withArgs('customIntegrations').resolves(false);

        webhookTrigger = new WebhookTrigger({models, payload, request, limitService});

        sinon.stub(webhookTrigger, 'onSuccess').callsFake(() => Promise.resolve());
        sinon.stub(webhookTrigger, 'onError').callsFake(() => Promise.resolve());
    });

    describe('onError', function () {
        let loggingStub;
        let errorTrigger;

        beforeEach(function () {
            loggingStub = sinon.stub(logging, 'error');
            errorTrigger = new WebhookTrigger({models, payload, request, limitService});
        });

        afterEach(function () {
            loggingStub.restore();
        });

        it('logs a structured error for failed webhook deliveries', function () {
            const webhookModel = {
                id: 'abc123',
                get: sinon.stub()
            };
            webhookModel.get
                .withArgs('event').returns('post.added')
                .withArgs('target_url').returns('https://example.com/hook');

            const err = new Error('URL resolves to a non-permitted private IP block');
            err.statusCode = 500;
            err.code = 'URL_PRIVATE_INVALID';

            errorTrigger.onError(webhookModel)(err);

            sinon.assert.calledOnce(loggingStub);

            // Example output:
            // [WEBHOOK_DELIVERY_FAILURE] url=https://example.com/hook status=500 error_code=URL_PRIVATE_INVALID message=URL resolves to a non-permitted private IP block
            const logLine = loggingStub.args[0][0];
            assert.ok(logLine.startsWith('[WEBHOOK_DELIVERY_FAILURE]'), 'Log line must start with [WEBHOOK_DELIVERY_FAILURE] prefix');
            assert.ok(logLine.includes('url=https://example.com/hook'));
            assert.ok(logLine.includes('status=500'));
            assert.ok(logLine.includes('error_code=URL_PRIVATE_INVALID'));
            assert.ok(logLine.includes('message=URL resolves to a non-permitted private IP block'));
            assert.equal(loggingStub.args[0][1], err, 'Error object must be passed as second argument for stack/metadata');
        });

        it('logs with fallback values when error properties are missing', function () {
            const webhookModel = {
                id: 'abc123',
                get: sinon.stub()
            };
            webhookModel.get
                .withArgs('event').returns('post.added')
                .withArgs('target_url').returns(null);

            const err = new Error();

            errorTrigger.onError(webhookModel)(err);

            const logLine = loggingStub.args[0][0];
            assert.ok(logLine.includes('url=unknown'));
            assert.ok(logLine.includes('status=none'));
            assert.ok(logLine.includes('error_code=unknown'));
        });
    });

    describe('trigger', function () {
        it('does not trigger payload handler when there are no hooks registered for an event', async function () {
            models.Webhook.findAllByEvent
                .withArgs(WEBHOOK_EVENT, {context: {internal: true}})
                .resolves({models: []});

            await webhookTrigger.trigger(WEBHOOK_EVENT);

            sinon.assert.called(models.Webhook.findAllByEvent);
            sinon.assert.notCalled(payload);
            sinon.assert.notCalled(request);
        });

        it('does not trigger payload handler when there are hooks registered for an event, but the custom integrations limit is active', async function () {
            const webhookModel = {
                get: sinon.stub(),
                related: sinon.stub()
            };

            webhookModel.get
                .withArgs('event').returns(WEBHOOK_EVENT)
                .withArgs('target_url').returns(WEBHOOK_TARGET_URL);

            webhookModel.related
                .withArgs('integration').returns(null);

            models.Webhook.findAllByEvent
                .withArgs(WEBHOOK_EVENT, {context: {internal: true}, withRelated: ['integration']})
                .resolves({models: [webhookModel]});

            limitService.isLimited.withArgs('customIntegrations').returns(true);
            limitService.checkWouldGoOverLimit.withArgs('customIntegrations').resolves(true);

            await webhookTrigger.trigger(WEBHOOK_EVENT);

            sinon.assert.called(models.Webhook.findAllByEvent);
            sinon.assert.notCalled(payload);
            sinon.assert.notCalled(request);
        });

        it('triggers payload handler when there are hooks registered for an event', async function () {
            const webhookModel = {
                get: sinon.stub()
            };

            webhookModel.get
                .withArgs('event').returns(WEBHOOK_EVENT)
                .withArgs('target_url').returns(WEBHOOK_TARGET_URL);

            models.Webhook.findAllByEvent
                .withArgs(WEBHOOK_EVENT, {context: {internal: true}})
                .resolves({models: [webhookModel]});

            const postModel = sinon.stub();

            payload
                .withArgs(WEBHOOK_EVENT, postModel)
                .resolves({data: [1]});

            await webhookTrigger.trigger(WEBHOOK_EVENT, postModel);

            sinon.assert.called(models.Webhook.findAllByEvent);
            sinon.assert.called(payload);
            sinon.assert.called(request);
            assert.equal(request.args[0][0], WEBHOOK_TARGET_URL);
            assert.equal(request.args[0][1].body, '{"data":[1]}');
            assert.deepEqual(Object.keys(request.args[0][1].headers), ['Content-Length', 'Content-Type', 'Content-Version']);
            assert.equal(request.args[0][1].headers['Content-Length'], 12);
            assert.equal(request.args[0][1].headers['Content-Type'], 'application/json');
            assert.match(request.args[0][1].headers['Content-Version'], /v\d+\.\d+/);
        });

        it('includes a signature header when a webhook has a secret', async function () {
            const webhookModel = {
                get: sinon.stub()
            };

            webhookModel.get
                .withArgs('event').returns(WEBHOOK_EVENT)
                .withArgs('target_url').returns(WEBHOOK_TARGET_URL)
                .withArgs('secret').returns(WEBHOOK_SECRET);

            models.Webhook.findAllByEvent
                .withArgs(WEBHOOK_EVENT, {context: {internal: true}})
                .resolves({models: [webhookModel]});

            const postModel = sinon.stub();

            payload
                .withArgs(WEBHOOK_EVENT, postModel)
                .resolves({data: [1]});

            await webhookTrigger.trigger(WEBHOOK_EVENT, postModel);

            sinon.assert.called(models.Webhook.findAllByEvent);
            sinon.assert.called(payload);
            sinon.assert.called(request);
            assert.equal(request.args[0][0], WEBHOOK_TARGET_URL);

            const header = request.args[0][1].headers[SIGNATURE_HEADER];
            assert.equal(SIGNATURE_REGEX.test(header), true);
        });

        it('uses the request payload and a timestamp to generate the hash in the signature header', async function () {
            const clock = sinon.useFakeTimers();
            const ts = Date.now();
            const webhookModel = {
                get: sinon.stub()
            };

            webhookModel.get
                .withArgs('event').returns(WEBHOOK_EVENT)
                .withArgs('target_url').returns(WEBHOOK_TARGET_URL)
                .withArgs('secret').returns(WEBHOOK_SECRET);

            models.Webhook.findAllByEvent
                .withArgs(WEBHOOK_EVENT, {context: {internal: true}})
                .resolves({models: [webhookModel]});

            const postModel = sinon.stub();

            payload
                .withArgs(WEBHOOK_EVENT, postModel)
                .resolves({data: [1]});

            await webhookTrigger.trigger(WEBHOOK_EVENT, postModel);

            sinon.assert.called(models.Webhook.findAllByEvent);
            sinon.assert.called(payload);
            sinon.assert.called(request);
            assert.equal(request.args[0][0], WEBHOOK_TARGET_URL);

            const expectedHeader = `sha256=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(`{"data":[1]}${ts}`).digest('hex')}, t=${ts}`;
            const header = request.args[0][1].headers[SIGNATURE_HEADER];
            assert.equal(expectedHeader, header);

            clock.restore();
        });
    });
});
