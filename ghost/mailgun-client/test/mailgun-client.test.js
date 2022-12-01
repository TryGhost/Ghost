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

    it('exports a number for BATCH_SIZE', function () {
        assert(typeof MailgunClient.BATCH_SIZE === 'number');
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
        settingsStub.withArgs('mailgun_base_url').returns('https://api.mailgun.net');

        const eventsMock1 = nock('https://api.mailgun.net')
            .get('/v3/settingsdomain.com/events')
            .query(MAILGUN_OPTIONS)
            .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
                'Content-Type': 'application/json'
            });

        const mailgunClient = new MailgunClient({config, settings});
        await mailgunClient.fetchEvents(MAILGUN_OPTIONS, () => {});

        settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey2');
        settingsStub.withArgs('mailgun_domain').returns('settingsdomain2.com');
        settingsStub.withArgs('mailgun_base_url').returns('https://api.mailgun.net');

        const eventsMock2 = nock('https://api.mailgun.net')
            .get('/v3/settingsdomain2.com/events')
            .query(MAILGUN_OPTIONS)
            .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
                'Content-Type': 'application/json'
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
                baseUrl: 'https://api.mailgun.net'
            }
        });

        const settingsStub = sinon.stub(settings, 'get');
        settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey');
        settingsStub.withArgs('mailgun_domain').returns('settingsdomain.com');
        settingsStub.withArgs('mailgun_base_url').returns('https://api.mailgun.net');

        const configApiMock = nock('https://api.mailgun.net')
            .get('/v3/configdomain.com/events')
            .query(MAILGUN_OPTIONS)
            .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
                'Content-Type': 'application/json'
            });

        const settingsApiMock = nock('https://api.mailgun.net')
            .get('/v3/settingsdomain.com/events')
            .query(MAILGUN_OPTIONS)
            .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
                'Content-Type': 'application/json'
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
                .query(MAILGUN_OPTIONS)
                .replyWithFile(200, `${__dirname}/fixtures/all-2.json`, {
                    'Content-Type': 'application/json'
                });

            // requests continue until an empty items set is returned
            nock('https://api.mailgun.net')
                .get('/v3/domain.com/events/all-2-next')
                .query(MAILGUN_OPTIONS)
                .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
                    'Content-Type': 'application/json'
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
                .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
                    'Content-Type': 'application/json'
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
                .query(MAILGUN_OPTIONS)
                .replyWithFile(200, `${__dirname}/fixtures/all-2-eu.json`, {
                    'Content-Type': 'application/json'
                });

            // requests continue until an empty items set is returned
            nock('https://api.eu.mailgun.net')
                .get('/v3/domain.com/events/all-2-next')
                .query(MAILGUN_OPTIONS)
                .replyWithFile(200, `${__dirname}/fixtures/empty.json`, {
                    'Content-Type': 'application/json'
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
                id: 'pl271FzxTTmGRW8Uj3dUWw',
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
                timestamp: new Date('2021-02-25T17:54:22.000Z'),
                error: null,
                id: 'pl271FzxTTmGRW8Uj3dUWw'
            });
        });

        it('works for errors', function () {
            const event = {
                event: 'failed',
                id: 'pl271FzxTTmGRW8Uj3dUWw',
                'log-level': 'error',
                severity: 'permanent',
                reason: 'suppress-bounce',
                envelope: {
                    sender: 'john@example.org',
                    transport: 'smtp',
                    targets: 'joan@example.com'
                },
                flags: {
                    'is-routed': false,
                    'is-authenticated': true,
                    'is-system-test': false,
                    'is-test-mode': false
                },
                'delivery-status': {
                    'attempt-no': 1,
                    message: '',
                    code: 605,
                    description: 'Not delivering to previously bounced address',
                    'session-seconds': 0.0
                },
                message: {
                    headers: {
                        to: 'joan@example.com',
                        'message-id': 'testProviderId',
                        from: 'john@example.org',
                        subject: 'Test Subject'
                    },
                    attachments: [],
                    size: 867
                },
                storage: {
                    url: 'https://se.api.mailgun.net/v3/domains/example.org/messages/eyJwI...',
                    key: 'eyJwI...'
                },
                recipient: 'testRecipient',
                'recipient-domain': 'mailgun.com',
                campaigns: [],
                tags: [],
                'user-variables': {},
                timestamp: 1614275662
            };

            const mailgunClient = new MailgunClient({config, settings});
            const result = mailgunClient.normalizeEvent(event);

            assert.deepStrictEqual(result, {
                type: 'failed',
                severity: 'permanent',
                recipientEmail: 'testRecipient',
                emailId: undefined,
                providerId: 'testProviderId',
                timestamp: new Date('2021-02-25T17:54:22.000Z'),
                error: {
                    code: 605,
                    enhancedCode: null,
                    message: 'Not delivering to previously bounced address'
                },
                id: 'pl271FzxTTmGRW8Uj3dUWw'
            });
        });

        it('works for enhanced errors', function () {
            const event = {
                event: 'failed',
                id: 'pl271FzxTTmGRW8Uj3dUWw',
                'log-level': 'error',
                severity: 'permanent',
                reason: 'suppress-bounce',
                envelope: {
                    sender: 'john@example.org',
                    transport: 'smtp',
                    targets: 'joan@example.com'
                },
                flags: {
                    'is-routed': false,
                    'is-authenticated': true,
                    'is-system-test': false,
                    'is-test-mode': false
                },
                'delivery-status': {
                    tls: true,
                    'mx-host': 'hotmail-com.olc.protection.outlook.com',
                    code: 451,
                    description: '',
                    'session-seconds': 0.7517080307006836,
                    utf8: true,
                    'retry-seconds': 600,
                    'enhanced-code': '4.7.652',
                    'attempt-no': 1,
                    message: '4.7.652 The mail server [xxx.xxx.xxx.xxx] has exceeded the maximum number of connections.',
                    'certificate-verified': true
                },
                message: {
                    headers: {
                        to: 'joan@example.com',
                        'message-id': 'testProviderId',
                        from: 'john@example.org',
                        subject: 'Test Subject'
                    },
                    attachments: [],
                    size: 867
                },
                storage: {
                    url: 'https://se.api.mailgun.net/v3/domains/example.org/messages/eyJwI...',
                    key: 'eyJwI...'
                },
                recipient: 'testRecipient',
                'recipient-domain': 'mailgun.com',
                campaigns: [],
                tags: [],
                'user-variables': {},
                timestamp: 1614275662
            };

            const mailgunClient = new MailgunClient({config, settings});
            const result = mailgunClient.normalizeEvent(event);

            assert.deepStrictEqual(result, {
                type: 'failed',
                severity: 'permanent',
                recipientEmail: 'testRecipient',
                emailId: undefined,
                providerId: 'testProviderId',
                timestamp: new Date('2021-02-25T17:54:22.000Z'),
                error: {
                    code: 451,
                    enhancedCode: '4.7.652',
                    message: '4.7.652 The mail server [xxx.xxx.xxx.xxx] has exceeded the maximum number of connections.'
                },
                id: 'pl271FzxTTmGRW8Uj3dUWw'
            });
        });
    });
});
