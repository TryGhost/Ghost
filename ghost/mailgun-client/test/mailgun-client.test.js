const assert = require('assert');
const nock = require('nock');
const sinon = require('sinon');

// module under test
const MailgunClient = require('../');

// Some sample Mailgun API options we might want to use
const MAILGUN_OPTIONS = {
    event: 'delivered OR opened OR failed OR unsubscribed OR complained',
    limit: 300,
    tags: 'bulk-email'
};

describe('MailgunClient', function () {
    let config, settings;

    beforeEach(function () {
        // options objects that can be stubbed or spied
        config = {get() {}};
        settings = {get() {}};
    });

    afterEach(function () {
        sinon.restore();
    });

    it('can connect via config', function () {
        const configStub = sinon.stub(config, 'get');
        configStub.withArgs('bulkEmail').returns({
            mailgun: {
                apiKey: 'apiKey',
                domain: 'domain.com',
                baseUrl: 'https://api.mailgun.net/v3'
            }
        });

        const mailgunClient = new MailgunClient({config, settings});
        assert.equal(mailgunClient.isConfigured(), true);
    });

    it('can connect via settings', function () {
        const settingsStub = sinon.stub(settings, 'get');
        settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey');
        settingsStub.withArgs('mailgun_domain').returns('settingsdomain.com');
        settingsStub.withArgs('mailgun_base_url').returns('https://example.com/v3');

        const mailgunClient = new MailgunClient({config, settings});
        assert.equal(mailgunClient.isConfigured(), true);
    });

    it('cannot configure Mailgun if config/settings missing', function () {
        const mailgunClient = new MailgunClient({config, settings});
        assert.equal(mailgunClient.isConfigured(), false);
    });

    it('respects changes in settings', async function () {
        const settingsStub = sinon.stub(settings, 'get');
        settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey');
        settingsStub.withArgs('mailgun_domain').returns('settingsdomain.com');
        settingsStub.withArgs('mailgun_base_url').returns('https://example.com/v3');

        const eventsMock1 = nock('https://example.com')
            .get('/v3/settingsdomain.com/events')
            .query(MAILGUN_OPTIONS)
            .reply(200, {'Content-Type': 'application/json'}, {
                items: []
            });

        const mailgunClient = new MailgunClient({config, settings});
        await mailgunClient.fetchEvents(MAILGUN_OPTIONS, () => {});

        settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey2');
        settingsStub.withArgs('mailgun_domain').returns('settingsdomain2.com');
        settingsStub.withArgs('mailgun_base_url').returns('https://example2.com/v3');

        const eventsMock2 = nock('https://example2.com')
            .get('/v3/settingsdomain2.com/events')
            .query(MAILGUN_OPTIONS)
            .reply(200, {'Content-Type': 'application/json'}, {
                items: []
            });

        await mailgunClient.fetchEvents(MAILGUN_OPTIONS, () => {});

        assert.equal(eventsMock1.isDone(), true);
        assert.equal(eventsMock2.isDone(), true);
    });

    it('prioritises config values over settings', async function () {
        const configStub = sinon.stub(config, 'get');
        configStub.withArgs('bulkEmail').returns({
            mailgun: {
                apiKey: 'apiKey',
                domain: 'configdomain.com',
                baseUrl: 'https://configapi.com/v3'
            }
        });

        const settingsStub = sinon.stub(settings, 'get');
        settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey');
        settingsStub.withArgs('mailgun_domain').returns('settingsdomain.com');
        settingsStub.withArgs('mailgun_base_url').returns('https://settingsapi.com/v3');

        const configApiMock = nock('https://configapi.com')
            .get('/v3/configdomain.com/events')
            .query(MAILGUN_OPTIONS)
            .reply(200, {'Content-Type': 'application/json'}, {
                items: []
            });

        const settingsApiMock = nock('https://settingsapi.com')
            .get('/v3/settingsdomain.com/events')
            .query(MAILGUN_OPTIONS)
            .reply(200, {'Content-Type': 'application/json'}, {
                items: []
            });

        const mailgunClient = new MailgunClient({config, settings});
        await mailgunClient.fetchEvents(MAILGUN_OPTIONS, () => {});

        assert.equal(configApiMock.isDone(), true);
        assert.equal(settingsApiMock.isDone(), false);
    });

    describe('send()', function () {
        it('does not send if not configured', async function () {
            const mailgunClient = new MailgunClient({config, settings});
            const response = await mailgunClient.send({}, {}, []);

            assert.strictEqual(response, null);
        });
    });

    describe('fetchEvents()', function () {
        it('does not fetch if not configured', async function () {
            const batchHandler = sinon.spy();
            const mailgunClient = new MailgunClient({config, settings});
            const events = await mailgunClient.fetchEvents(MAILGUN_OPTIONS, batchHandler);

            assert.equal(events.length, 0);
            assert.equal(batchHandler.callCount, 0);
        });

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
                .query(MAILGUN_OPTIONS)
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

            const batchHandler = sinon.spy();

            const mailgunClient = new MailgunClient({config, settings});
            await mailgunClient.fetchEvents(MAILGUN_OPTIONS, batchHandler);

            assert.equal(firstPageMock.isDone(), true);
            assert.equal(secondPageMock.isDone(), true);
            assert.equal(batchHandler.callCount, 2); // one per page
        });

        it('fetches with a limit', async function () {
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
                .query(MAILGUN_OPTIONS)
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

            const batchHandler = sinon.stub().returnsArg(0);

            const maxEvents = 3;

            const mailgunClient = new MailgunClient({config, settings});
            const events = await mailgunClient.fetchEvents(MAILGUN_OPTIONS, batchHandler, {maxEvents});

            assert.equal(events.length, 4); // `maxEvents` is 3 but the first page contains 4 events
            assert.equal(firstPageMock.isDone(), true);
            assert.equal(secondPageMock.isDone(), false);
            assert.equal(batchHandler.callCount, 1);
        });

        it('supports EU Mailgun domain', async function () {
            const configStub = sinon.stub(config, 'get');
            configStub.withArgs('bulkEmail').returns({
                mailgun: {
                    apiKey: 'apiKey',
                    domain: 'domain.com',
                    baseUrl: 'https://api.eu.mailgun.net/v3'
                }
            });

            const firstPageMock = nock('https://api.eu.mailgun.net')
                .get('/v3/domain.com/events')
                .query(MAILGUN_OPTIONS)
                .replyWithFile(200, `${__dirname}/fixtures/all-1-eu.json`, {
                    'Content-Type': 'application/json'
                });

            const secondPageMock = nock('https://api.eu.mailgun.net')
                .get('/v3/domain.com/events/all-1-next')
                .replyWithFile(200, `${__dirname}/fixtures/all-2-eu.json`, {
                    'Content-Type': 'application/json'
                });

            // requests continue until an empty items set is returned
            nock('https://api.eu.mailgun.net')
                .get('/v3/domain.com/events/all-2-next')
                .reply(200, {'Content-Type': 'application/json'}, {
                    items: []
                });

            const batchHandler = sinon.spy();

            const mailgunClient = new MailgunClient({config, settings});
            await mailgunClient.fetchEvents(MAILGUN_OPTIONS, batchHandler);

            assert.equal(firstPageMock.isDone(), true);
            assert.equal(secondPageMock.isDone(), true);
            assert.equal(batchHandler.callCount, 2); // one per page
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

            const mailgunClient = new MailgunClient({config, settings});
            const result = mailgunClient.normalizeEvent(event);

            assert.deepStrictEqual(result, {
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
