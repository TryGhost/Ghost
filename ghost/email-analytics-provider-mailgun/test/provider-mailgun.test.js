const sinon = require('sinon');

const {EventProcessingResult} = require('@tryghost/email-analytics-service');

// module under test
const EmailAnalyticsProviderMailgun = require('../');

const SAMPLE_EVENTS = [
    new EventProcessingResult({
        delivered: 4,
        opened: 2,
        temporaryFailed: 0,
        permanentFailed: 0,
        unsubscribed: 0,
        complained: 0,
        unhandled: 0,
        unprocessable: 0,
        processingFailures: 0,
        emailIds: [
            '62f3aebaaa887b504a40519f',
            '62f3c200e8e74e677ab5e1fa',
            '62f3c606de193a6d00433dfc'
        ],
        memberIds: ['62ed25f69ae8f1a8c22d1a2f']
    })
];

describe('EmailAnalyticsProviderMailgun', function () {
    let config, settings;

    beforeEach(function () {
        // options objects that can be stubbed or spied
        config = {get() {}};
        settings = {get() {}};
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('fetchAll()', function () {
        const MAILGUN_OPTIONS = {
            event: 'delivered OR opened OR failed OR unsubscribed OR complained',
            limit: 300,
            tags: 'bulk-email'
        };

        it('passes the correct parameters to mailgun-client', async function () {
            const configStub = sinon.stub(config, 'get');
            configStub.withArgs('bulkEmail').returns({
                mailgun: {
                    apiKey: 'apiKey',
                    domain: 'domain.com',
                    baseUrl: 'https://api.mailgun.net/v3'
                }
            });

            const mailgunProvider = new EmailAnalyticsProviderMailgun({config, settings});

            const batchHandler = sinon.spy();
            const mailgunFetchEventsStub = sinon.stub(mailgunProvider.mailgunClient, 'fetchEvents').returns(SAMPLE_EVENTS);

            await mailgunProvider.fetchAll(batchHandler);
            sinon.assert.calledWithExactly(mailgunFetchEventsStub, MAILGUN_OPTIONS, batchHandler, undefined);
        });

        it('uses custom tags when supplied', async function () {
            const configStub = sinon.stub(config, 'get');
            configStub.withArgs('bulkEmail').returns({
                mailgun: {
                    apiKey: 'apiKey',
                    domain: 'domain.com',
                    baseUrl: 'https://api.mailgun.net/v3'
                }
            });
            configStub.withArgs('bulkEmail:mailgun:tag').returns('custom-tag');

            const mailgunProvider = new EmailAnalyticsProviderMailgun({config, settings});

            const batchHandler = sinon.spy();
            const mailgunFetchEventsStub = sinon.stub(mailgunProvider.mailgunClient, 'fetchEvents').returns(SAMPLE_EVENTS);

            await mailgunProvider.fetchAll(batchHandler);

            sinon.assert.calledWithExactly(mailgunFetchEventsStub, {
                ...MAILGUN_OPTIONS,
                tags: 'bulk-email AND custom-tag'
            }, batchHandler, undefined);
        });
    });

    describe('fetchLatest()', function () {
        const LATEST_TIMESTAMP = new Date('Thu Feb 25 2021 12:00:00 GMT+0000');
        const MAILGUN_OPTIONS = {
            event: 'delivered OR opened OR failed OR unsubscribed OR complained',
            limit: 300,
            tags: 'bulk-email',
            begin: 'Thu, 25 Feb 2021 11:30:00 GMT',
            ascending: 'yes'
        };

        it('passes the correct parameters to mailgun-client', async function () {
            const configStub = sinon.stub(config, 'get');
            configStub.withArgs('bulkEmail').returns({
                mailgun: {
                    apiKey: 'apiKey',
                    domain: 'domain.com',
                    baseUrl: 'https://api.mailgun.net/v3'
                }
            });

            const mailgunProvider = new EmailAnalyticsProviderMailgun({config, settings});

            const batchHandler = sinon.spy();
            const mailgunFetchEventsStub = sinon.stub(mailgunProvider.mailgunClient, 'fetchEvents').returns(SAMPLE_EVENTS);

            await mailgunProvider.fetchLatest(LATEST_TIMESTAMP, batchHandler);
            sinon.assert.calledWithExactly(mailgunFetchEventsStub, MAILGUN_OPTIONS, batchHandler, undefined);
        });

        it('uses custom tags when supplied', async function () {
            const configStub = sinon.stub(config, 'get');
            configStub.withArgs('bulkEmail').returns({
                mailgun: {
                    apiKey: 'apiKey',
                    domain: 'domain.com',
                    baseUrl: 'https://api.mailgun.net/v3'
                }
            });
            configStub.withArgs('bulkEmail:mailgun:tag').returns('custom-tag');

            const mailgunProvider = new EmailAnalyticsProviderMailgun({config, settings});

            const batchHandler = sinon.spy();
            const mailgunFetchEventsStub = sinon.stub(mailgunProvider.mailgunClient, 'fetchEvents').returns(SAMPLE_EVENTS);

            await mailgunProvider.fetchLatest(LATEST_TIMESTAMP, batchHandler);

            sinon.assert.calledWithExactly(mailgunFetchEventsStub, {
                ...MAILGUN_OPTIONS,
                tags: 'bulk-email AND custom-tag'
            }, batchHandler, undefined);
        });
    });
});
