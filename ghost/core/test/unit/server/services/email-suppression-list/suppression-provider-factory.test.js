const should = require('should');
const sinon = require('sinon');

/**
 * Tests for suppression-provider-factory module
 *
 * These tests execute the ACTUAL production code from suppression-provider-factory.js,
 * following the same pattern as PR2's email-provider-factory and PR3's analytics-provider-factory tests.
 */
describe('Suppression Provider Factory', function () {
    let sandbox;
    let factory;
    let mockConfig;
    let mockSettings;
    let mockModels;
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
        factory = proxyquire('../../../../../core/server/services/email-suppression-list/suppression-provider-factory', {
            '@tryghost/logging': loggingStub
        });

        // Create mocks for dependencies
        mockConfig = {
            get: sandbox.stub()
        };

        mockSettings = {
            get: sandbox.stub()
        };

        mockModels = {
            Suppression: {
                findOne: sandbox.stub(),
                findAll: sandbox.stub(),
                add: sandbox.stub(),
                destroy: sandbox.stub()
            }
        };
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('resolveSuppressionProvider', function () {
        it('should export resolveSuppressionProvider function', function () {
            should.exist(factory.resolveSuppressionProvider);
            factory.resolveSuppressionProvider.should.be.a.Function();
        });

        it('returns mailgun for mailgun email provider', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('mailgun');

            const result = factory.resolveSuppressionProvider(mockConfig);

            should.equal(result, 'mailgun');
            mockConfig.get.calledOnce.should.be.true();
            mockConfig.get.calledWith('bulkEmail:provider').should.be.true();
            loggingStub.warn.called.should.be.false();
        });

        it('returns mailgun when no provider configured (default)', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(undefined);

            const result = factory.resolveSuppressionProvider(mockConfig);

            should.equal(result, 'mailgun');
            loggingStub.warn.called.should.be.false();
        });

        it('returns mailgun for empty string (default)', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('');

            const result = factory.resolveSuppressionProvider(mockConfig);

            should.equal(result, 'mailgun');
            loggingStub.warn.called.should.be.false();
        });

        it('returns null for unknown email providers and logs warning', function () {
            const unsupportedProviders = ['sendgrid', 'ses', 'postmark', 'smtp', 'brevo', 'resend'];

            unsupportedProviders.forEach((provider) => {
                mockConfig.get.reset();
                loggingStub.warn.reset();
                mockConfig.get.withArgs('bulkEmail:provider').returns(provider);

                const result = factory.resolveSuppressionProvider(mockConfig);

                should.equal(result, null);
                loggingStub.warn.calledOnce.should.be.true();
                loggingStub.warn.calledWith(`No suppression list provider available for email provider: ${provider}`).should.be.true();
            });
        });

        it('returns null for false value and logs warning', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(false);

            const result = factory.resolveSuppressionProvider(mockConfig);

            should.equal(result, null);
            loggingStub.warn.calledOnce.should.be.true();
        });

        it('returns null for 0 value and logs warning', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(0);

            const result = factory.resolveSuppressionProvider(mockConfig);

            should.equal(result, null);
            loggingStub.warn.calledOnce.should.be.true();
        });

        it('returns null for null value and logs warning', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(null);

            const result = factory.resolveSuppressionProvider(mockConfig);

            should.equal(result, null);
            loggingStub.warn.calledOnce.should.be.true();
        });
    });

    describe('createSuppressionProvider', function () {
        let MailgunClientStub;
        let MailgunEmailSuppressionListStub;
        let InMemoryEmailSuppressionListStub;
        let mailgunClientInstance;
        let mailgunSuppressionInstance;
        let inMemorySuppressionInstance;

        beforeEach(function () {
            // Create instances that will be returned
            mailgunClientInstance = {
                removeBounce: sandbox.stub(),
                removeComplaint: sandbox.stub(),
                removeUnsubscribe: sandbox.stub()
            };

            mailgunSuppressionInstance = {
                getSuppressionData: sandbox.stub(),
                getBulkSuppressionData: sandbox.stub(),
                removeEmail: sandbox.stub(),
                init: sandbox.stub()
            };

            inMemorySuppressionInstance = {
                getSuppressionData: sandbox.stub(),
                getBulkSuppressionData: sandbox.stub(),
                removeEmail: sandbox.stub(),
                init: sandbox.stub()
            };

            // Create constructor stubs
            MailgunClientStub = sandbox.stub().returns(mailgunClientInstance);
            MailgunEmailSuppressionListStub = sandbox.stub().returns(mailgunSuppressionInstance);
            InMemoryEmailSuppressionListStub = sandbox.stub().returns(inMemorySuppressionInstance);
        });

        it('should export createSuppressionProvider function', function () {
            should.exist(factory.createSuppressionProvider);
            factory.createSuppressionProvider.should.be.a.Function();
        });

        it('creates MailgunEmailSuppressionList for mailgun config', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('mailgun');

            const proxyquire = require('proxyquire').noPreserveCache();
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-suppression-list/suppression-provider-factory', {
                '@tryghost/logging': loggingStub,
                '../lib/MailgunClient': MailgunClientStub,
                './MailgunEmailSuppressionList': MailgunEmailSuppressionListStub
            });

            const result = factoryWithMocks.createSuppressionProvider(mockConfig, mockSettings, mockModels);

            // Verify MailgunClient was created with correct config
            MailgunClientStub.calledOnce.should.be.true();
            MailgunClientStub.calledWith({
                config: mockConfig,
                settings: mockSettings
            }).should.be.true();

            // Verify MailgunEmailSuppressionList was created
            MailgunEmailSuppressionListStub.calledOnce.should.be.true();
            MailgunEmailSuppressionListStub.calledWith({
                Suppression: mockModels.Suppression,
                apiClient: mailgunClientInstance
            }).should.be.true();

            // Result should be the suppression list instance
            result.should.equal(mailgunSuppressionInstance);
        });

        it('creates MailgunEmailSuppressionList when provider is not configured (default)', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(undefined);

            const proxyquire = require('proxyquire').noPreserveCache();
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-suppression-list/suppression-provider-factory', {
                '@tryghost/logging': loggingStub,
                '../lib/MailgunClient': MailgunClientStub,
                './MailgunEmailSuppressionList': MailgunEmailSuppressionListStub
            });

            const result = factoryWithMocks.createSuppressionProvider(mockConfig, mockSettings, mockModels);

            MailgunClientStub.calledOnce.should.be.true();
            MailgunEmailSuppressionListStub.calledOnce.should.be.true();
            result.should.equal(mailgunSuppressionInstance);
        });

        it('returns InMemoryEmailSuppressionList for unsupported providers', function () {
            const unsupportedProviders = ['sendgrid', 'ses', 'postmark'];

            unsupportedProviders.forEach((provider) => {
                mockConfig.get.reset();
                loggingStub.warn.reset();
                mockConfig.get.withArgs('bulkEmail:provider').returns(provider);

                const proxyquire = require('proxyquire').noPreserveCache();
                const InMemoryStub = sandbox.stub().returns(inMemorySuppressionInstance);
                const factoryWithMocks = proxyquire('../../../../../core/server/services/email-suppression-list/suppression-provider-factory', {
                    '@tryghost/logging': loggingStub,
                    './InMemoryEmailSuppressionList': InMemoryStub
                });

                const result = factoryWithMocks.createSuppressionProvider(mockConfig, mockSettings, mockModels);

                InMemoryStub.calledOnce.should.be.true();
                result.should.equal(inMemorySuppressionInstance);
                loggingStub.warn.calledOnce.should.be.true();
            });
        });

        it('returns InMemoryEmailSuppressionList and logs warning for null provider', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(null);

            const proxyquire = require('proxyquire').noPreserveCache();
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-suppression-list/suppression-provider-factory', {
                '@tryghost/logging': loggingStub,
                './InMemoryEmailSuppressionList': InMemoryEmailSuppressionListStub
            });

            const result = factoryWithMocks.createSuppressionProvider(mockConfig, mockSettings, mockModels);

            InMemoryEmailSuppressionListStub.calledOnce.should.be.true();
            result.should.equal(inMemorySuppressionInstance);
            loggingStub.warn.calledOnce.should.be.true();
        });

        it('handles empty string as mailgun default', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('');

            const proxyquire = require('proxyquire').noPreserveCache();
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-suppression-list/suppression-provider-factory', {
                '@tryghost/logging': loggingStub,
                '../lib/MailgunClient': MailgunClientStub,
                './MailgunEmailSuppressionList': MailgunEmailSuppressionListStub
            });

            const result = factoryWithMocks.createSuppressionProvider(mockConfig, mockSettings, mockModels);

            MailgunClientStub.calledOnce.should.be.true();
            MailgunEmailSuppressionListStub.calledOnce.should.be.true();
            result.should.equal(mailgunSuppressionInstance);
        });

        it('returns InMemoryEmailSuppressionList for false value', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(false);

            const proxyquire = require('proxyquire').noPreserveCache();
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-suppression-list/suppression-provider-factory', {
                '@tryghost/logging': loggingStub,
                './InMemoryEmailSuppressionList': InMemoryEmailSuppressionListStub
            });

            const result = factoryWithMocks.createSuppressionProvider(mockConfig, mockSettings, mockModels);

            InMemoryEmailSuppressionListStub.calledOnce.should.be.true();
            result.should.equal(inMemorySuppressionInstance);
            loggingStub.warn.calledOnce.should.be.true();
        });

        it('returns InMemoryEmailSuppressionList for 0 value', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(0);

            const proxyquire = require('proxyquire').noPreserveCache();
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-suppression-list/suppression-provider-factory', {
                '@tryghost/logging': loggingStub,
                './InMemoryEmailSuppressionList': InMemoryEmailSuppressionListStub
            });

            const result = factoryWithMocks.createSuppressionProvider(mockConfig, mockSettings, mockModels);

            InMemoryEmailSuppressionListStub.calledOnce.should.be.true();
            result.should.equal(inMemorySuppressionInstance);
            loggingStub.warn.calledOnce.should.be.true();
        });
    });

    describe('Integration with service.js', function () {
        it('can be required and used by service.js', function () {
            const {createSuppressionProvider, resolveSuppressionProvider} = factory;

            should.exist(createSuppressionProvider);
            should.exist(resolveSuppressionProvider);
            createSuppressionProvider.should.be.a.Function();
            resolveSuppressionProvider.should.be.a.Function();
        });

        it('returns instance format expected by service consumers', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('mailgun');

            const proxyquire = require('proxyquire').noPreserveCache();
            const MailgunClientStub = sandbox.stub().returns({});
            const MailgunSuppressionStub = sandbox.stub().returns({test: 'instance'});
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-suppression-list/suppression-provider-factory', {
                '@tryghost/logging': loggingStub,
                '../lib/MailgunClient': MailgunClientStub,
                './MailgunEmailSuppressionList': MailgunSuppressionStub
            });

            const result = factoryWithMocks.createSuppressionProvider(mockConfig, mockSettings, mockModels);

            // Service expects a single instance, not an array
            result.should.be.an.Object();
            result.should.not.be.an.Array();
        });
    });
});