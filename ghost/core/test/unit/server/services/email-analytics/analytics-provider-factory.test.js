const should = require('should');
const sinon = require('sinon');

/**
 * Tests for analytics-provider-factory module
 *
 * These tests execute the ACTUAL production code from analytics-provider-factory.js,
 * following the same pattern as PR2's email-provider-factory tests.
 */
describe('Analytics Provider Factory', function () {
    let sandbox;
    let factory;
    let mockConfig;
    let mockSettings;
    let loggingStub;

    beforeEach(function () {
        sandbox = sinon.createSandbox();

        // Create logging stub before requiring the module
        loggingStub = {
            warn: sandbox.stub(),
            error: sandbox.stub()
        };

        // Use proxyquire to inject the logging stub
        const proxyquire = require('proxyquire').noPreserveCache();
        factory = proxyquire('../../../../../core/server/services/email-analytics/analytics-provider-factory', {
            '@tryghost/logging': loggingStub
        });

        // Create mocks for dependencies
        mockConfig = {
            get: sandbox.stub()
        };

        mockSettings = {
            get: sandbox.stub()
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('resolveAnalyticsProvider', function () {
        it('should export resolveAnalyticsProvider function', function () {
            should.exist(factory.resolveAnalyticsProvider);
            factory.resolveAnalyticsProvider.should.be.a.Function();
        });

        it('returns mailgun analytics for mailgun email provider', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('mailgun');

            const result = factory.resolveAnalyticsProvider(mockConfig);

            should.equal(result, 'mailgun');
            mockConfig.get.calledOnce.should.be.true();
            mockConfig.get.calledWith('bulkEmail:provider').should.be.true();
            loggingStub.warn.called.should.be.false();
        });

        it('returns mailgun analytics when no provider configured (default)', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(undefined);

            const result = factory.resolveAnalyticsProvider(mockConfig);

            should.equal(result, 'mailgun');
            loggingStub.warn.called.should.be.false();
        });

        it('returns mailgun analytics for empty string (default)', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('');

            const result = factory.resolveAnalyticsProvider(mockConfig);

            should.equal(result, 'mailgun');
            loggingStub.warn.called.should.be.false();
        });

        it('returns null for unknown email providers and logs warning', function () {
            const unsupportedProviders = ['sendgrid', 'ses', 'postmark', 'smtp', 'brevo', 'resend'];

            unsupportedProviders.forEach((provider) => {
                mockConfig.get.reset();
                loggingStub.warn.reset();
                mockConfig.get.withArgs('bulkEmail:provider').returns(provider);

                const result = factory.resolveAnalyticsProvider(mockConfig);

                should.equal(result, null);
                loggingStub.warn.calledOnce.should.be.true();
                loggingStub.warn.calledWith(`No analytics provider available for email provider: ${provider}`).should.be.true();
            });
        });

        it('returns null for false value and logs warning', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(false);

            const result = factory.resolveAnalyticsProvider(mockConfig);

            should.equal(result, null);
            loggingStub.warn.calledOnce.should.be.true();
        });

        it('returns null for 0 value and logs warning', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(0);

            const result = factory.resolveAnalyticsProvider(mockConfig);

            should.equal(result, null);
            loggingStub.warn.calledOnce.should.be.true();
        });
    });

    describe('createAnalyticsProviders', function () {
        let MailgunProviderStub;
        let mailgunProviderInstance;

        beforeEach(function () {
            // Create instance that will be returned
            mailgunProviderInstance = {
                fetchLatest: sandbox.stub(),
                fetchMissing: sandbox.stub()
            };

            // Create constructor stub
            MailgunProviderStub = sandbox.stub().returns(mailgunProviderInstance);
        });

        it('should export createAnalyticsProviders function', function () {
            should.exist(factory.createAnalyticsProviders);
            factory.createAnalyticsProviders.should.be.a.Function();
        });

        it('creates MailgunProvider for mailgun config', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('mailgun');

            // Use proxyquire to inject the MailgunProvider stub
            const proxyquire = require('proxyquire').noPreserveCache();
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-analytics/analytics-provider-factory', {
                '@tryghost/logging': loggingStub,
                './EmailAnalyticsProviderMailgun': MailgunProviderStub
            });

            const result = factoryWithMocks.createAnalyticsProviders(mockConfig, mockSettings);

            // Verify MailgunProvider was created with correct config
            MailgunProviderStub.calledOnce.should.be.true();
            MailgunProviderStub.calledWith({
                config: mockConfig,
                settings: mockSettings
            }).should.be.true();

            // Result should be array with the provider instance
            result.should.be.an.Array();
            result.length.should.equal(1);
            result[0].should.equal(mailgunProviderInstance);
        });

        it('creates MailgunProvider when provider is not configured (default)', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(undefined);

            const proxyquire = require('proxyquire').noPreserveCache();
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-analytics/analytics-provider-factory', {
                '@tryghost/logging': loggingStub,
                './EmailAnalyticsProviderMailgun': MailgunProviderStub
            });

            const result = factoryWithMocks.createAnalyticsProviders(mockConfig, mockSettings);

            MailgunProviderStub.calledOnce.should.be.true();
            result.should.be.an.Array();
            result.length.should.equal(1);
            result[0].should.equal(mailgunProviderInstance);
        });

        it('returns empty array for unsupported providers', function () {
            const unsupportedProviders = ['sendgrid', 'ses', 'postmark'];

            unsupportedProviders.forEach((provider) => {
                mockConfig.get.reset();
                loggingStub.warn.reset();
                mockConfig.get.withArgs('bulkEmail:provider').returns(provider);

                const result = factory.createAnalyticsProviders(mockConfig, mockSettings);

                result.should.be.an.Array();
                result.length.should.equal(0);
                loggingStub.warn.calledOnce.should.be.true();
            });
        });

        it('returns empty array and logs warning for null provider', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(null);

            const result = factory.createAnalyticsProviders(mockConfig, mockSettings);

            result.should.be.an.Array();
            result.length.should.equal(0);
            loggingStub.warn.calledOnce.should.be.true();
        });

        it('handles empty string as mailgun default', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('');

            const proxyquire = require('proxyquire').noPreserveCache();
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-analytics/analytics-provider-factory', {
                '@tryghost/logging': loggingStub,
                './EmailAnalyticsProviderMailgun': MailgunProviderStub
            });

            const result = factoryWithMocks.createAnalyticsProviders(mockConfig, mockSettings);

            MailgunProviderStub.calledOnce.should.be.true();
            result.should.be.an.Array();
            result.length.should.equal(1);
        });
    });

    describe('Integration with EmailAnalyticsServiceWrapper', function () {
        it('can be required and used by EmailAnalyticsServiceWrapper', function () {
            const {createAnalyticsProviders, resolveAnalyticsProvider} = factory;

            should.exist(createAnalyticsProviders);
            should.exist(resolveAnalyticsProvider);
            createAnalyticsProviders.should.be.a.Function();
            resolveAnalyticsProvider.should.be.a.Function();
        });

        it('returns array format expected by EmailAnalyticsService', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('mailgun');

            const proxyquire = require('proxyquire').noPreserveCache();
            const MailgunProviderStub = sandbox.stub().returns({test: 'provider'});
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-analytics/analytics-provider-factory', {
                '@tryghost/logging': loggingStub,
                './EmailAnalyticsProviderMailgun': MailgunProviderStub
            });

            const result = factoryWithMocks.createAnalyticsProviders(mockConfig, mockSettings);

            // EmailAnalyticsService expects an array in the 'providers' field
            result.should.be.an.Array();
            result.forEach((provider) => {
                provider.should.be.an.Object();
            });
        });
    });
});