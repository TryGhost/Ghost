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

    describe('fetchLatest()', function () {
        const LATEST_TIMESTAMP = new Date('Thu Feb 25 2021 12:00:00 GMT+0000');
        const END_EXAMPLE = new Date('Thu Feb 25 2021 14:00:00 GMT+0000');
        const MAILGUN_OPTIONS = {
            event: 'delivered OR opened OR failed OR unsubscribed OR complained',
            limit: 300,
            tags: 'bulk-email',
            begin: 1614254400,
            end: undefined,
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

            await mailgunProvider.fetchLatest(batchHandler, {begin: LATEST_TIMESTAMP});
            sinon.assert.calledWithExactly(mailgunFetchEventsStub, MAILGUN_OPTIONS, batchHandler, {maxEvents: undefined});
        });

        it('can use end timestamp', async function () {
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

            await mailgunProvider.fetchLatest(batchHandler, {begin: LATEST_TIMESTAMP, end: END_EXAMPLE});

            const END_EXAMPLE_UNIX = END_EXAMPLE.getTime() / 1000;
            sinon.assert.calledWithExactly(mailgunFetchEventsStub, {...MAILGUN_OPTIONS, end: END_EXAMPLE_UNIX}, batchHandler, {maxEvents: undefined});
        });

        it('can use end without begin', async function () {
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

            await mailgunProvider.fetchLatest(batchHandler, {end: END_EXAMPLE});

            const END_EXAMPLE_UNIX = END_EXAMPLE.getTime() / 1000;
            sinon.assert.calledWithExactly(mailgunFetchEventsStub, {...MAILGUN_OPTIONS, begin: undefined, end: END_EXAMPLE_UNIX}, batchHandler, {maxEvents: undefined});
        });

        it('can use max events', async function () {
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

            await mailgunProvider.fetchLatest(batchHandler, {begin: LATEST_TIMESTAMP, end: END_EXAMPLE, maxEvents: 1000});

            const END_EXAMPLE_UNIX = END_EXAMPLE.getTime() / 1000;
            sinon.assert.calledWithExactly(mailgunFetchEventsStub, {...MAILGUN_OPTIONS, end: END_EXAMPLE_UNIX}, batchHandler, {maxEvents: 1000});
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

            await mailgunProvider.fetchLatest(batchHandler, {begin: LATEST_TIMESTAMP});

            sinon.assert.calledWithExactly(mailgunFetchEventsStub, {
                ...MAILGUN_OPTIONS,
                tags: 'bulk-email AND custom-tag'
            }, batchHandler, {maxEvents: undefined});
        });

        it('uses provided events when supplied', async function () {
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

            await mailgunProvider.fetchLatest(batchHandler, {events: ['delivered'], begin: LATEST_TIMESTAMP});

            sinon.assert.calledWithExactly(mailgunFetchEventsStub, {
                ...MAILGUN_OPTIONS,
                event: 'delivered',
                tags: 'bulk-email'
            }, batchHandler, {maxEvents: undefined});
        });
    });
});
