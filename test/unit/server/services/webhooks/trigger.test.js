const assert = require('assert');
const sinon = require('sinon');

const WebhookTrigger = require('../../../../../core/server/services/webhooks/trigger');

describe('Webhook Service', function () {
    const models = {
        Webhook: {
            edit: () => sinon.stub().resolves(null),
            destroy: () => sinon.stub().resolves(null),
            findAllByEvent: () => sinon.stub().resolves(null),
            getByEventAndTarget: () => sinon.stub().resolves(null),
            add: () => sinon.stub().resolves(null)
        }
    };

    let payload = sinon.stub().resolves(null);

    afterEach(function () {
        sinon.restore();
    });

    describe('trigger', function () {
        it('Does not trigger payload handler when event and model that has no hooks registered', async function () {
            sinon.stub(models.Webhook, 'findAllByEvent')
                .withArgs('post.added', {context: {internal: true}})
                .resolves({models: []});

            const webhookTrigger = new WebhookTrigger({
                models,
                payload
            });

            await webhookTrigger.trigger('post.added');

            assert.equal(models.Webhook.findAllByEvent.called, true);
            assert.equal(payload.called, false);
        });

        it('Does triggers payload handler and request when event when model has a registered hook', async function () {
            const postModelStub = sinon.stub();
            const webhookModelStub = {
                get: () => {}
            };
            sinon.stub(webhookModelStub, 'get')
                .withArgs('event').returns('post.added')
                .withArgs('target_url').returns('http://example.com');

            const requestStub = sinon.stub().resolves({});

            sinon.stub(models.Webhook, 'findAllByEvent')
                .withArgs('post.added', {context: {internal: true}})
                .resolves({models: [webhookModelStub]});

            payload = sinon.stub().resolves({data: [1]});

            const webhookTrigger = new WebhookTrigger({
                models,
                payload,
                request: requestStub
            });

            sinon.stub(webhookTrigger, 'onSuccess').callsFake(function () {
                return Promise.resolve();
            });
            sinon.stub(webhookTrigger, 'onError').callsFake(function () {
                return Promise.resolve();
            });
            await webhookTrigger.trigger('post.added', postModelStub);

            assert.equal(models.Webhook.findAllByEvent.called, true);
            assert.equal(payload.called, true);

            assert.equal(requestStub.called, true);
            assert.equal(requestStub.args[0][0], 'http://example.com');
            assert.equal(requestStub.args[0][1].body, '{"data":[1]}');
            assert.deepEqual(Object.keys(requestStub.args[0][1].headers), ['Content-Length', 'Content-Type', 'Content-Version']);
            assert.equal(requestStub.args[0][1].headers['Content-Length'], 12);
            assert.equal(requestStub.args[0][1].headers['Content-Type'], 'application/json');
            assert.match(requestStub.args[0][1].headers['Content-Version'], /v\d+\.\d+/);
        });
    });
});
