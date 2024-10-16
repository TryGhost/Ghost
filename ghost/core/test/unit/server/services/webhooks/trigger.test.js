const assert = require('assert/strict');
const crypto = require('crypto');
const sinon = require('sinon');

const WebhookTrigger = require('../../../../../core/server/services/webhooks/WebhookTrigger');

const SIGNATURE_HEADER = 'X-Ghost-Signature';
const SIGNATURE_REGEX = /^sha256=[a-z0-9]+, t=\d+$/;

describe('Webhook Service', function () {
    const WEBHOOK_EVENT = 'post.added';
    const WEBHOOK_TARGET_URL = 'http://example.com';
    const WEBHOOK_SECRET = 'abc123dontstealme';

    let models, payload, request, webhookTrigger;

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

        webhookTrigger = new WebhookTrigger({models, payload, request});

        sinon.stub(webhookTrigger, 'onSuccess').callsFake(() => Promise.resolve());
        sinon.stub(webhookTrigger, 'onError').callsFake(() => Promise.resolve());
    });

    describe('trigger', function () {
        it('does not trigger payload handler when there are no hooks registered for an event', async function () {
            models.Webhook.findAllByEvent
                .withArgs(WEBHOOK_EVENT, {context: {internal: true}})
                .resolves({models: []});

            await webhookTrigger.trigger(WEBHOOK_EVENT);

            assert.equal(models.Webhook.findAllByEvent.called, true);
            assert.equal(payload.called, false);
            assert.equal(request.called, false);
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

            assert.equal(models.Webhook.findAllByEvent.called, true);
            assert.equal(payload.called, true);
            assert.equal(request.called, true);
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

            assert.equal(models.Webhook.findAllByEvent.called, true);
            assert.equal(payload.called, true);
            assert.equal(request.called, true);
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

            assert.equal(models.Webhook.findAllByEvent.called, true);
            assert.equal(payload.called, true);
            assert.equal(request.called, true);
            assert.equal(request.args[0][0], WEBHOOK_TARGET_URL);

            const expectedHeader = `sha256=${crypto.createHmac('sha256', WEBHOOK_SECRET).update(`{"data":[1]}${ts}`).digest('hex')}, t=${ts}`;
            const header = request.args[0][1].headers[SIGNATURE_HEADER];
            assert.equal(expectedHeader, header);

            clock.restore();
        });
    });
});
