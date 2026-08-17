const assert = require('node:assert/strict');
const EmailProviderBase = require('../../../../../core/server/adapters/email/email-provider-base');

describe('UNIT: EmailProviderBase', function () {
    it('requires the complete send-side contract', function () {
        const provider = new EmailProviderBase();

        assert.deepEqual(provider.requiredFns, ['send', 'getMaximumRecipients', 'getTargetDeliveryWindow']);

        assert.throws(() => {
            provider.requiredFns = [];
        });
    });

    it('throws on send() when not implemented', async function () {
        const provider = new EmailProviderBase();

        await assert.rejects(() => provider.send());
    });

    it('throws on getMaximumRecipients() and getTargetDeliveryWindow() when not implemented', function () {
        const provider = new EmailProviderBase();

        assert.throws(() => provider.getMaximumRecipients());
        assert.throws(() => provider.getTargetDeliveryWindow());
    });

    it('defaults webhook ingestion to unsupported, not an error', function () {
        const provider = new EmailProviderBase();

        assert.equal(provider.verifyWebhookRequest({}), false);
        assert.deepEqual(provider.parseWebhookEvents({}), []);
    });
});
