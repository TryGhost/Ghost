const assert = require('node:assert/strict');
const sinon = require('sinon');

const createWebhookService = require('../../../../../core/server/services/webhooks/webhooks-service');

describe('Webhook Service', function () {
    const models = {
        Webhook: {
            getByEventAndTarget: () => {},
            add: () => {}
        }
    };

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
            assert.fail('should have thrown');
        } catch (err) {
            assert.equal(err.name, 'CustomTestError');
        }
    });
});
