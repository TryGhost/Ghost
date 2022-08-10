const assert = require('assert');
const nock = require('nock');
const sinon = require('sinon');

// module under test
const MailgunClient = require('../');

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

        const mailgunOptions = {
            event: 'delivered OR opened OR failed OR unsubscribed OR complained',
            limit: 300,
            tags: 'bulk-email'
        };

        const eventsMock1 = nock('https://example.com')
            .get('/v3/settingsdomain.com/events')
            .query(mailgunOptions)
            .reply(200, {'Content-Type': 'application/json'}, {
                items: []
            });

        const mailgunClient = new MailgunClient({config, settings});
        await mailgunClient.fetchEvents(mailgunOptions, () => {});

        settingsStub.withArgs('mailgun_api_key').returns('settingsApiKey2');
        settingsStub.withArgs('mailgun_domain').returns('settingsdomain2.com');
        settingsStub.withArgs('mailgun_base_url').returns('https://example2.com/v3');

        const eventsMock2 = nock('https://example2.com')
            .get('/v3/settingsdomain2.com/events')
            .query(mailgunOptions)
            .reply(200, {'Content-Type': 'application/json'}, {
                items: []
            });

        await mailgunClient.fetchEvents(mailgunOptions, () => {});

        assert.equal(eventsMock1.isDone(), true);
        assert.equal(eventsMock2.isDone(), true);
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
