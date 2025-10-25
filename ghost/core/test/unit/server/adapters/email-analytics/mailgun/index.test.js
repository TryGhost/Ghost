const should = require('should');
const sinon = require('sinon');
const MailgunEmailAnalyticsProvider = require('../../../../../../core/server/adapters/email-analytics/mailgun');
const EmailAnalyticsBase = require('../../../../../../core/server/adapters/email-analytics/EmailAnalyticsBase');

describe('Mailgun Email Analytics Provider Adapter', function () {
    let mailgunClient;
    let config;
    let settings;
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.createSandbox();

        // Mock mailgun client
        mailgunClient = {
            fetchEvents: sandbox.stub().resolves()
        };

        // Mock config
        config = {
            get: sandbox.stub()
        };
        config.get.withArgs('bulkEmail:mailgun:tag').returns(undefined);

        // Mock settings
        settings = {};

        // Stub MailgunClient constructor
        sandbox.stub(require('../../../../../../core/server/services/lib/MailgunClient').prototype, 'fetchEvents')
            .callsFake(mailgunClient.fetchEvents);
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Constructor', function () {
        it('should extend EmailAnalyticsBase', function () {
            const adapter = new MailgunEmailAnalyticsProvider({
                config,
                settings
            });

            should.exist(adapter);
            adapter.should.be.instanceOf(EmailAnalyticsBase);
        });

        it('should throw error if config is missing', function () {
            try {
                new MailgunEmailAnalyticsProvider({
                    settings
                });
                throw new Error('Should have thrown an error');
            } catch (err) {
                err.message.should.match(/Mailgun analytics adapter requires config and settings/);
            }
        });

        it('should throw error if settings is missing', function () {
            try {
                new MailgunEmailAnalyticsProvider({
                    config
                });
                throw new Error('Should have thrown an error');
            } catch (err) {
                err.message.should.match(/Mailgun analytics adapter requires config and settings/);
            }
        });

        it('should use default tags', function () {
            const adapter = new MailgunEmailAnalyticsProvider({
                config,
                settings
            });

            should.exist(adapter);
            // Tags are private but we can verify through fetchLatest behavior
        });

        it('should add custom tag from config', function () {
            config.get.withArgs('bulkEmail:mailgun:tag').returns('custom-tag');

            const adapter = new MailgunEmailAnalyticsProvider({
                config,
                settings
            });

            should.exist(adapter);
            // Custom tag will be verified in fetchLatest tests
        });
    });

    describe('fetchLatest()', function () {
        let adapter;
        let batchHandler;

        beforeEach(function () {
            adapter = new MailgunEmailAnalyticsProvider({
                config,
                settings
            });

            batchHandler = sandbox.stub();
        });

        it('should call mailgun client fetchEvents', async function () {
            await adapter.fetchLatest(batchHandler, {
                begin: new Date('2025-01-01T00:00:00Z'),
                end: new Date('2025-01-02T00:00:00Z')
            });

            mailgunClient.fetchEvents.calledOnce.should.be.true();
        });

        it('should pass correct options to mailgun client', async function () {
            await adapter.fetchLatest(batchHandler, {
                begin: new Date('2025-01-01T00:00:00Z'),
                end: new Date('2025-01-02T00:00:00Z'),
                maxEvents: 1000
            });

            const mailgunOptions = mailgunClient.fetchEvents.firstCall.args[0];

            mailgunOptions.limit.should.equal(300);
            mailgunOptions.event.should.equal('delivered OR opened OR failed OR unsubscribed OR complained');
            mailgunOptions.tags.should.equal('bulk-email');
            mailgunOptions.begin.should.equal(1735689600); // Unix timestamp
            mailgunOptions.end.should.equal(1735776000);
            mailgunOptions.ascending.should.equal('yes');
        });

        it('should convert Date objects to Unix timestamps', async function () {
            const begin = new Date('2025-01-15T12:30:00Z');
            const end = new Date('2025-01-16T14:45:00Z');

            await adapter.fetchLatest(batchHandler, {
                begin,
                end
            });

            const mailgunOptions = mailgunClient.fetchEvents.firstCall.args[0];

            mailgunOptions.begin.should.equal(begin.getTime() / 1000);
            mailgunOptions.end.should.equal(end.getTime() / 1000);
        });

        it('should handle custom event types', async function () {
            await adapter.fetchLatest(batchHandler, {
                begin: new Date('2025-01-01'),
                events: ['opened', 'delivered']
            });

            const mailgunOptions = mailgunClient.fetchEvents.firstCall.args[0];

            mailgunOptions.event.should.equal('opened OR delivered');
        });

        it('should use default event filter when events not specified', async function () {
            await adapter.fetchLatest(batchHandler, {
                begin: new Date('2025-01-01')
            });

            const mailgunOptions = mailgunClient.fetchEvents.firstCall.args[0];

            mailgunOptions.event.should.equal('delivered OR opened OR failed OR unsubscribed OR complained');
        });

        it('should include custom tag when configured', async function () {
            config.get.withArgs('bulkEmail:mailgun:tag').returns('newsletter');

            const adapterWithTag = new MailgunEmailAnalyticsProvider({
                config,
                settings
            });

            await adapterWithTag.fetchLatest(batchHandler, {
                begin: new Date('2025-01-01')
            });

            const mailgunOptions = mailgunClient.fetchEvents.firstCall.args[0];

            mailgunOptions.tags.should.equal('bulk-email AND newsletter');
        });

        it('should pass batchHandler to mailgun client', async function () {
            await adapter.fetchLatest(batchHandler, {
                begin: new Date('2025-01-01')
            });

            const passedHandler = mailgunClient.fetchEvents.firstCall.args[1];

            passedHandler.should.equal(batchHandler);
        });

        it('should pass maxEvents option', async function () {
            await adapter.fetchLatest(batchHandler, {
                begin: new Date('2025-01-01'),
                maxEvents: 5000
            });

            const options = mailgunClient.fetchEvents.firstCall.args[2];

            options.maxEvents.should.equal(5000);
        });

        it('should work without maxEvents', async function () {
            await adapter.fetchLatest(batchHandler, {
                begin: new Date('2025-01-01')
            });

            const options = mailgunClient.fetchEvents.firstCall.args[2];

            should.not.exist(options.maxEvents);
        });

        it('should work without begin/end timestamps', async function () {
            await adapter.fetchLatest(batchHandler, {});

            const mailgunOptions = mailgunClient.fetchEvents.firstCall.args[0];

            should.not.exist(mailgunOptions.begin);
            should.not.exist(mailgunOptions.end);
        });
    });

    describe('Adapter Contract', function () {
        it('should have required fetchLatest method', function () {
            const adapter = new MailgunEmailAnalyticsProvider({
                config,
                settings
            });

            adapter.should.have.property('fetchLatest');
            adapter.fetchLatest.should.be.a.Function();
        });

        it('should have requiredFns array with fetchLatest', function () {
            const adapter = new MailgunEmailAnalyticsProvider({
                config,
                settings
            });

            adapter.requiredFns.should.be.an.Array();
            adapter.requiredFns.should.containEql('fetchLatest');
        });
    });
});
