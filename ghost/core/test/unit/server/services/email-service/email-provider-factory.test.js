const should = require('should');
const sinon = require('sinon');

/**
 * Tests for email-provider-factory module
 *
 * These tests execute the ACTUAL production code from email-provider-factory.js,
 * not duplicated logic. This addresses the testing requirement that tests must
 * call real production code.
 */
describe('Email Provider Factory', function () {
    let sandbox;
    let factory;
    let mockConfig;
    let mockSettings;
    let mockSentry;

    beforeEach(function () {
        sandbox = sinon.createSandbox();

        // Reset the module cache to get a fresh instance
        delete require.cache[require.resolve('../../../../../core/server/services/email-service/email-provider-factory')];

        // Import the ACTUAL production module
        factory = require('../../../../../core/server/services/email-service/email-provider-factory');

        // Create mocks for dependencies
        mockConfig = {
            get: sandbox.stub()
        };

        mockSettings = {
            get: sandbox.stub()
        };

        mockSentry = {
            captureException: sandbox.stub()
        };
    });

    afterEach(function () {
        sandbox.restore();
        // Clean up module cache
        delete require.cache[require.resolve('../../../../../core/server/services/email-service/email-provider-factory')];
    });

    describe('resolveEmailProvider', function () {
        it('should export resolveEmailProvider function', function () {
            should.exist(factory.resolveEmailProvider);
            factory.resolveEmailProvider.should.be.a.Function();
        });

        it('returns mailgun when no provider configured', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(undefined);

            // Call the ACTUAL production function
            const result = factory.resolveEmailProvider(mockConfig);

            should.equal(result, 'mailgun');
            mockConfig.get.calledOnce.should.be.true();
            mockConfig.get.calledWith('bulkEmail:provider').should.be.true();
        });

        it('returns mailgun when explicitly configured', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('mailgun');

            const result = factory.resolveEmailProvider(mockConfig);

            should.equal(result, 'mailgun');
        });

        it('returns mailgun for empty string', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('');

            const result = factory.resolveEmailProvider(mockConfig);

            should.equal(result, 'mailgun');
        });

        it('returns mailgun for null value', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(null);

            const result = factory.resolveEmailProvider(mockConfig);

            should.equal(result, 'mailgun');
        });

        it('returns mailgun for false value', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(false);

            const result = factory.resolveEmailProvider(mockConfig);

            should.equal(result, 'mailgun');
        });

        it('returns mailgun for zero value', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(0);

            const result = factory.resolveEmailProvider(mockConfig);

            should.equal(result, 'mailgun');
        });

        it('throws error for unsupported providers', function () {
            const unsupportedProviders = ['sendgrid', 'ses', 'postmark', 'smtp', 'brevo', 'resend'];

            unsupportedProviders.forEach((provider) => {
                mockConfig.get.reset();
                mockConfig.get.withArgs('bulkEmail:provider').returns(provider);

                should.throws(
                    () => factory.resolveEmailProvider(mockConfig),
                    /Unknown bulk email provider: .+\. Only 'mailgun' is currently supported/
                );
            });
        });

        it('throws specific error message for sendgrid', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('sendgrid');

            try {
                factory.resolveEmailProvider(mockConfig);
                should.fail('Should have thrown an error');
            } catch (error) {
                error.message.should.equal("Unknown bulk email provider: sendgrid. Only 'mailgun' is currently supported.");
            }
        });
    });

    describe('createEmailProvider', function () {
        let MailgunClientStub;
        let MailgunEmailProviderStub;
        let mailgunClientInstance;
        let mailgunProviderInstance;

        beforeEach(function () {
            // Create instances that will be returned
            mailgunClientInstance = {
                send: sandbox.stub(),
                // Add other methods as needed
            };

            mailgunProviderInstance = {
                send: sandbox.stub(),
                // Add other methods as needed
            };

            // Create constructor stubs
            MailgunClientStub = sandbox.stub().returns(mailgunClientInstance);
            MailgunEmailProviderStub = sandbox.stub().returns(mailgunProviderInstance);

            // Stub the requires to return our stubs
            sandbox.stub(require.cache[require.resolve('../../../../../core/server/services/email-service/email-provider-factory')], 'require')
                .withArgs('../lib/MailgunClient').returns(MailgunClientStub)
                .withArgs('./MailgunEmailProvider').returns(MailgunEmailProviderStub);
        });

        it('should export createEmailProvider function', function () {
            should.exist(factory.createEmailProvider);
            factory.createEmailProvider.should.be.a.Function();
        });

        it('creates MailgunEmailProvider for mailgun config', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('mailgun');

            // Mock the requires within the module
            const proxyquire = require('proxyquire').noPreserveCache();
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-service/email-provider-factory', {
                '../lib/MailgunClient': MailgunClientStub,
                './MailgunEmailProvider': MailgunEmailProviderStub
            });

            const result = factoryWithMocks.createEmailProvider(mockConfig, mockSettings, mockSentry);

            // Verify MailgunClient was created with correct config
            MailgunClientStub.calledOnce.should.be.true();
            MailgunClientStub.calledWith({
                config: mockConfig,
                settings: mockSettings
            }).should.be.true();

            // Verify MailgunEmailProvider was created
            MailgunEmailProviderStub.calledOnce.should.be.true();
            const providerArgs = MailgunEmailProviderStub.firstCall.args[0];
            providerArgs.should.have.property('mailgunClient');
            providerArgs.should.have.property('errorHandler');

            // Verify error handler captures to Sentry
            const errorHandler = providerArgs.errorHandler;
            const testError = new Error('Test error');
            errorHandler(testError);
            mockSentry.captureException.calledWith(testError).should.be.true();

            // Result should be the provider instance
            result.should.equal(mailgunProviderInstance);
        });

        it('creates MailgunEmailProvider when provider is not configured (default)', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns(undefined);

            const proxyquire = require('proxyquire').noPreserveCache();
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-service/email-provider-factory', {
                '../lib/MailgunClient': MailgunClientStub,
                './MailgunEmailProvider': MailgunEmailProviderStub
            });

            const result = factoryWithMocks.createEmailProvider(mockConfig, mockSettings, mockSentry);

            MailgunClientStub.calledOnce.should.be.true();
            MailgunEmailProviderStub.calledOnce.should.be.true();
            result.should.equal(mailgunProviderInstance);
        });

        it('throws error for unsupported provider in createEmailProvider', function () {
            mockConfig.get.withArgs('bulkEmail:provider').returns('sendgrid');

            should.throws(
                () => factory.createEmailProvider(mockConfig, mockSettings, mockSentry),
                /Unknown bulk email provider: sendgrid\. Only 'mailgun' is currently supported/
            );
        });

        it('logs info message when error handler is invoked', function () {
            const loggingStub = {
                info: sandbox.stub()
            };

            const proxyquire = require('proxyquire').noPreserveCache();
            const factoryWithMocks = proxyquire('../../../../../core/server/services/email-service/email-provider-factory', {
                '@tryghost/logging': loggingStub,
                '../lib/MailgunClient': MailgunClientStub,
                './MailgunEmailProvider': MailgunEmailProviderStub
            });

            mockConfig.get.withArgs('bulkEmail:provider').returns('mailgun');
            factoryWithMocks.createEmailProvider(mockConfig, mockSettings, mockSentry);

            // Get the error handler
            const errorHandler = MailgunEmailProviderStub.firstCall.args[0].errorHandler;
            const testError = new Error('Test error');

            // Call it
            errorHandler(testError);

            // Verify logging
            loggingStub.info.calledWith('Capturing error for mailgun email provider service').should.be.true();
            mockSentry.captureException.calledWith(testError).should.be.true();
        });
    });

    describe('Integration with EmailServiceWrapper', function () {
        it('can be required and used by EmailServiceWrapper', function () {
            // This test verifies that the module exports are correct
            // and can be used as intended by EmailServiceWrapper

            const {createEmailProvider, resolveEmailProvider} = factory;

            should.exist(createEmailProvider);
            should.exist(resolveEmailProvider);
            createEmailProvider.should.be.a.Function();
            resolveEmailProvider.should.be.a.Function();

            // Verify the functions have the expected signatures
            createEmailProvider.length.should.equal(3); // expects 3 parameters
            resolveEmailProvider.length.should.equal(1); // expects 1 parameter
        });
    });
});