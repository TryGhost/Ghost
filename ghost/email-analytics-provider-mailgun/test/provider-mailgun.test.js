// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const nock = require('nock');
const sinon = require('sinon');

// module under test
const EmailAnalyticsProviderMailgun = require('../');

describe('EmailAnalyticsProviderMailgun', function () {
    let config, settings, logging;

    beforeEach(function () {
        // options objects that can be stubbed or spied
        config = {get() {}};
        settings = {get() {}};
        logging = {warn() {}};
    });

    afterEach(function () {
        sinon.restore();
    });

    it('can connect via config', async function () {
        const configStub = sinon.stub(config, 'get');
        configStub.withArgs('bulkEmail').returns({
            mailgun: {
                apiKey: 'apiKey',
                domain: 'domain.com',
                baseUrl: 'https://api.mailgun.net/v3'
            }
        });

        const eventsMock = nock('https://api.mailgun.net')
            .get('/v3/domain.com/events')
            .query({
                event: 'delivered OR opened OR failed OR unsubscribed OR complained',
                limit: 300,
                tags: 'bulk-email'
            })
            .reply(200, {'Content-Type': 'application/json'}, {
                items: []
            });

        const mailgunProvider = new EmailAnalyticsProviderMailgun({config, settings, logging});
        await mailgunProvider.fetchAll(() => {});

        eventsMock.isDone().should.be.true();
    });

    it('can connect via settings', async function () {
        const settingsStub = sinon.stub(settings, 'get');
        settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey');
        settingsStub.withArgs('mailgun_domain').returns('settingsdomain.com');
        settingsStub.withArgs('mailgun_base_url').returns('https://example.com/v3');

        const eventsMock = nock('https://example.com')
            .get('/v3/settingsdomain.com/events')
            .query({
                event: 'delivered OR opened OR failed OR unsubscribed OR complained',
                limit: 300,
                tags: 'bulk-email'
            })
            .reply(200, {'Content-Type': 'application/json'}, {
                items: []
            });

        const mailgunProvider = new EmailAnalyticsProviderMailgun({config, settings, logging});
        await mailgunProvider.fetchAll(() => {});

        eventsMock.isDone().should.be.true();
    });

    it('respects changes in settings', async function () {
        const settingsStub = sinon.stub(settings, 'get');
        settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey');
        settingsStub.withArgs('mailgun_domain').returns('settingsdomain.com');
        settingsStub.withArgs('mailgun_base_url').returns('https://example.com/v3');

        const eventsMock1 = nock('https://example.com')
            .get('/v3/settingsdomain.com/events')
            .query({
                event: 'delivered OR opened OR failed OR unsubscribed OR complained',
                limit: 300,
                tags: 'bulk-email'
            })
            .reply(200, {'Content-Type': 'application/json'}, {
                items: []
            });

        const mailgunProvider = new EmailAnalyticsProviderMailgun({config, settings, logging});
        await mailgunProvider.fetchAll(() => {});

        settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey2');
        settingsStub.withArgs('mailgun_domain').returns('settingsdomain2.com');
        settingsStub.withArgs('mailgun_base_url').returns('https://example2.com/v3');

        const eventsMock2 = nock('https://example2.com')
            .get('/v3/settingsdomain2.com/events')
            .query({
                event: 'delivered OR opened OR failed OR unsubscribed OR complained',
                limit: 300,
                tags: 'bulk-email'
            })
            .reply(200, {'Content-Type': 'application/json'}, {
                items: []
            });

        await mailgunProvider.fetchAll(() => {});

        eventsMock1.isDone().should.be.true();
        eventsMock2.isDone().should.be.true();
    });

    describe('fetchAll()', function () {
        it('fetches from now and works backwards', async function () {
            const configStub = sinon.stub(config, 'get');
            configStub.withArgs('bulkEmail').returns({
                mailgun: {
                    apiKey: 'apiKey',
                    domain: 'domain.com',
                    baseUrl: 'https://api.mailgun.net/v3'
                }
            });

            const firstPageMock = nock('https://api.mailgun.net')
                .get('/v3/domain.com/events')
                .query({
                    event: 'delivered OR opened OR failed OR unsubscribed OR complained',
                    limit: 300,
                    tags: 'bulk-email'
                })
                .replyWithFile(200, `${__dirname}/fixtures/all-1.json`, {
                    'Content-Type': 'application/json'
                });

            const secondPageMock = nock('https://api.mailgun.net')
                .get('/v3/domain.com/events/all-1-next')
                .replyWithFile(200, `${__dirname}/fixtures/all-2.json`, {
                    'Content-Type': 'application/json'
                });

            // requests continue until an empty items set is returned
            nock('https://api.mailgun.net')
                .get('/v3/domain.com/events/all-2-next')
                .reply(200, {'Content-Type': 'application/json'}, {
                    items: []
                });

            const mailgunProvider = new EmailAnalyticsProviderMailgun({config, settings, logging});

            const batchHandler = sinon.spy();

            await mailgunProvider.fetchAll(batchHandler);

            firstPageMock.isDone().should.be.true();
            secondPageMock.isDone().should.be.true();
            batchHandler.callCount.should.eql(2); // one per page
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

            const firstPageMock = nock('https://api.mailgun.net')
                .get('/v3/domain.com/events')
                .query({
                    event: 'delivered OR opened OR failed OR unsubscribed OR complained',
                    limit: 300,
                    tags: 'bulk-email AND custom-tag'
                })
                .replyWithFile(200, `${__dirname}/fixtures/all-1.json`, {
                    'Content-Type': 'application/json'
                });

            nock('https://api.mailgun.net')
                .get('/v3/domain.com/events/all-1-next')
                .replyWithFile(200, `${__dirname}/fixtures/all-2.json`, {
                    'Content-Type': 'application/json'
                });

            // requests continue until an empty items set is returned
            nock('https://api.mailgun.net')
                .get('/v3/domain.com/events/all-2-next')
                .reply(200, {'Content-Type': 'application/json'}, {
                    items: []
                });

            const mailgunProvider = new EmailAnalyticsProviderMailgun({config, settings, logging});

            const batchHandler = sinon.spy();

            await mailgunProvider.fetchAll(batchHandler);

            firstPageMock.isDone().should.be.true();
            batchHandler.callCount.should.eql(2); // one per page
        });
    });

    describe('fetchLatest()', function () {
        it('fetches from now and works backwards', async function () {
            const configStub = sinon.stub(config, 'get');
            configStub.withArgs('bulkEmail').returns({
                mailgun: {
                    apiKey: 'apiKey',
                    domain: 'domain.com',
                    baseUrl: 'https://api.mailgun.net/v3'
                }
            });

            const firstPageMock = nock('https://api.mailgun.net')
                .get('/v3/domain.com/events')
                .query({
                    event: 'delivered OR opened OR failed OR unsubscribed OR complained',
                    limit: 300,
                    tags: 'bulk-email',
                    begin: 'Thu, 25 Feb 2021 11:30:00 GMT', // latest minus threshold
                    ascending: 'yes'
                })
                .replyWithFile(200, `${__dirname}/fixtures/all-1.json`, {
                    'Content-Type': 'application/json'
                });

            const secondPageMock = nock('https://api.mailgun.net')
                .get('/v3/domain.com/events/all-1-next')
                .replyWithFile(200, `${__dirname}/fixtures/all-2.json`, {
                    'Content-Type': 'application/json'
                });

            // requests continue until an empty items set is returned
            nock('https://api.mailgun.net')
                .get('/v3/domain.com/events/all-2-next')
                .reply(200, {'Content-Type': 'application/json'}, {
                    items: []
                });

            const mailgunProvider = new EmailAnalyticsProviderMailgun({config, settings, logging});

            const batchHandler = sinon.spy();

            const latestTimestamp = new Date('Thu Feb 25 2021 12:00:00 GMT+0000');
            await mailgunProvider.fetchLatest(latestTimestamp, batchHandler);

            firstPageMock.isDone().should.be.true();
            secondPageMock.isDone().should.be.true();
            batchHandler.callCount.should.eql(2); // one per page
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

            const firstPageMock = nock('https://api.mailgun.net')
                .get('/v3/domain.com/events')
                .query({
                    event: 'delivered OR opened OR failed OR unsubscribed OR complained',
                    limit: 300,
                    tags: 'bulk-email AND custom-tag',
                    begin: 'Thu, 25 Feb 2021 11:30:00 GMT', // latest minus threshold
                    ascending: 'yes'
                })
                .replyWithFile(200, `${__dirname}/fixtures/all-1.json`, {
                    'Content-Type': 'application/json'
                });

            nock('https://api.mailgun.net')
                .get('/v3/domain.com/events/all-1-next')
                .replyWithFile(200, `${__dirname}/fixtures/all-2.json`, {
                    'Content-Type': 'application/json'
                });

            // requests continue until an empty items set is returned
            nock('https://api.mailgun.net')
                .get('/v3/domain.com/events/all-2-next')
                .reply(200, {'Content-Type': 'application/json'}, {
                    items: []
                });

            const mailgunProvider = new EmailAnalyticsProviderMailgun({config, settings, logging});

            const batchHandler = sinon.spy();

            const latestTimestamp = new Date('Thu Feb 25 2021 12:00:00 GMT+0000');
            await mailgunProvider.fetchLatest(latestTimestamp, batchHandler);

            firstPageMock.isDone().should.be.true();
            batchHandler.callCount.should.eql(2); // one per page
        });
    });

    describe('normalizeEvent()', function () {
        it('works', function () {
            const event = {
                event: 'testEvent',
                severity: 'testSeverity',
                recipient: 'testRecipient',
                timestamp: 1614275662,
                message: {
                    headers: {
                        'message-id': 'testProviderId'
                    }
                },
                'user-variables': {
                    'email-id': 'testEmailId'
                }
            };

            const mailgunProvider = new EmailAnalyticsProviderMailgun({config, settings, logging});
            const result = mailgunProvider.normalizeEvent(event);

            result.should.deepEqual({
                type: 'testEvent',
                severity: 'testSeverity',
                recipientEmail: 'testRecipient',
                emailId: 'testEmailId',
                providerId: 'testProviderId',
                timestamp: new Date('2021-02-25T17:54:22.000Z')
            });
        });
    });
});
