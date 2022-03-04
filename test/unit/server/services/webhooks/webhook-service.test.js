const errors = require('@tryghost/errors');
const should = require('should');
const sinon = require('sinon');

const createWebhookService = require('../../../../../core/server/services/webhooks/webhooks-service');
const models = require('../../../../../core/server/models');

describe('Webhook Service', function () {
    before(models.init);

    afterEach(function () {
        sinon.restore();
    });

    it('re-throws any unhandled errors', async function () {
        sinon.stub(models.Webhook, 'getByEventAndTarget').resolves(null);
        sinon.stub(models.Webhook, 'add').throws('CustomTestError');

        const webhookService = createWebhookService({WebhookModel: models.Webhook});

        const fakeWebhook = {
            webhooks: [
                {
                    event: 'post.published',
                    target_url: 'http://example.com/webhook'
                }
            ]
        };

        try {
            await webhookService.add(fakeWebhook, {});
            should.fail('should have thrown');
        } catch (err) {
            err.name.should.equal('CustomTestError');
        }
    });
});
