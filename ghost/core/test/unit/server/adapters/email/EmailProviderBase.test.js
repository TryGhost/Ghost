const EmailProviderBase = require('../../../../../core/server/adapters/email/EmailProviderBase');
const assert = require('node:assert/strict');

describe('EmailProviderBase', function () {
    it('has required functions defined', function () {
        assert.deepEqual(
            EmailProviderBase.requiredFns,
            ['send', 'getMaximumRecipients', 'getTargetDeliveryWindow', 'fetchLatest']
        );
    });

    it('throws error when send is not implemented', async function () {
        const provider = new EmailProviderBase({});

        await assert.rejects(
            async () => await provider.send({}, {}),
            {
                message: 'EmailProviderBase.send must be implemented by the email adapter'
            }
        );
    });

    it('throws error when getMaximumRecipients is not implemented', function () {
        const provider = new EmailProviderBase({});

        assert.throws(
            () => provider.getMaximumRecipients(),
            {
                message: 'EmailProviderBase.getMaximumRecipients must be implemented by the email adapter'
            }
        );
    });

    it('throws error when getTargetDeliveryWindow is not implemented', function () {
        const provider = new EmailProviderBase({});

        assert.throws(
            () => provider.getTargetDeliveryWindow(),
            {
                message: 'EmailProviderBase.getTargetDeliveryWindow must be implemented by the email adapter'
            }
        );
    });

    it('throws error when fetchLatest is not implemented', async function () {
        const provider = new EmailProviderBase({});

        await assert.rejects(
            async () => await provider.fetchLatest(() => {}, {}),
            {
                message: 'EmailProviderBase.fetchLatest must be implemented by the email adapter'
            }
        );
    });

    it('stores config in constructor', function () {
        const config = {configService: {}, settingsCache: {}};
        const provider = new EmailProviderBase(config);

        assert.equal(provider.config, config);
    });
});
