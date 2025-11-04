const assert = require('assert/strict');

const EmailAnalyticsProviderSES = require('../../../../../core/server/services/email-analytics/EmailAnalyticsProviderSES');

describe('EmailAnalyticsProviderSES', function () {
    describe('constructor', function () {
        it('initializes with valid SQS config', function () {
            const config = {
                queueUrl: 'https://sqs.us-west-1.amazonaws.com/123456789/ses-events-queue',
                region: 'us-west-1',
                accessKeyId: 'test-key',
                secretAccessKey: 'test-secret'
            };

            const provider = new EmailAnalyticsProviderSES({config});
            assert.ok(provider);
        });

        it('initializes without config', function () {
            const provider = new EmailAnalyticsProviderSES({config: {}});
            assert.ok(provider);
        });

        it('initializes with missing credentials (will use IAM role)', function () {
            const config = {
                queueUrl: 'https://sqs.us-west-1.amazonaws.com/123456789/ses-events-queue',
                region: 'us-west-1'
            };

            const provider = new EmailAnalyticsProviderSES({config});
            assert.ok(provider);
        });
    });

    describe('fetchLatest()', function () {
        it('handles missing SQS client gracefully', async function () {
            const provider = new EmailAnalyticsProviderSES({config: {}});
            const batchHandler = () => {};

            // Should not throw when SQS client is not initialized
            await provider.fetchLatest(batchHandler);
        });
    });
});
