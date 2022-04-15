const should = require('should');
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

    const payload = sinon.stub().resolves(null);

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

            should.equal(models.Webhook.findAllByEvent.called, true);
            should.equal(payload.called, false);
        });
    });
});
