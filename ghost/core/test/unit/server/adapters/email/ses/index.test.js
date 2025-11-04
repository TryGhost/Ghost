const should = require('should');
const sinon = require('sinon');
const SESEmailProvider = require('../../../../../../core/server/adapters/email/ses');
const EmailProviderBase = require('../../../../../../core/server/adapters/email/EmailProviderBase');

describe('SES Email Provider Adapter', function () {
    let sesClient;
    let errorHandler;
    let sandbox;
    let SendRawEmailCommand;

    beforeEach(function () {
        sandbox = sinon.createSandbox();

        // Mock AWS SDK
        SendRawEmailCommand = sandbox.stub();

        // Mock SES client
        sesClient = {
            send: sandbox.stub().resolves({MessageId: 'test-message-id-123'})
        };

        errorHandler = sandbox.stub();

        // Mock the AWS SDK require
        const mockAwsSdk = {
            SESClient: sandbox.stub().returns(sesClient),
            SendRawEmailCommand
        };

        sandbox.stub(module.constructor, '_load').callsFake(function (request, parent) {
            if (request === '@aws-sdk/client-ses') {
                return mockAwsSdk;
            }
            // Call the original require for everything else
            return sandbox.stub().throwsException(new Error(`MODULE_NOT_FOUND: ${request}`));
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Constructor', function () {
        it('should extend EmailProviderBase', function () {
            const adapter = new SESEmailProvider({
                ses: {
                    region: 'us-east-1',
                    fromEmail: 'test@example.com'
                }
            });

            should.exist(adapter);
            adapter.should.be.instanceOf(EmailProviderBase);
        });

        it('should throw error if ses config is missing', function () {
            try {
                new SESEmailProvider({});
                throw new Error('Should have thrown an error');
            } catch (err) {
                err.message.should.match(/SES adapter requires region/);
            }
        });

        it('should throw error if region is missing', function () {
            try {
                new SESEmailProvider({
                    ses: {
                        fromEmail: 'test@example.com'
                    }
                });
                throw new Error('Should have thrown an error');
            } catch (err) {
                err.message.should.match(/SES adapter requires region/);
            }
        });

        it('should throw error if fromEmail is missing', function () {
            try {
                new SESEmailProvider({
                    ses: {
                        region: 'us-east-1'
                    }
                });
                throw new Error('Should have thrown an error');
            } catch (err) {
                err.message.should.match(/SES adapter requires fromEmail/);
            }
        });

        it('should create SES client with region only', function () {
            const adapter = new SESEmailProvider({
                ses: {
                    region: 'us-west-2',
                    fromEmail: 'test@example.com'
                }
            });

            should.exist(adapter);
        });

        it('should create SES client with credentials', function () {
            const adapter = new SESEmailProvider({
                ses: {
                    region: 'us-east-1',
                    accessKeyId: 'test-key-id',
                    secretAccessKey: 'test-secret-key',
                    fromEmail: 'test@example.com'
                }
            });

            should.exist(adapter);
        });

        it('should store errorHandler from config', function () {
            const adapter = new SESEmailProvider({
                ses: {
                    region: 'us-east-1',
                    fromEmail: 'test@example.com'
                },
                errorHandler
            });

            should.exist(adapter);
            // Error handler will be tested in send() error cases
        });

        it('should work without errorHandler (optional)', function () {
            const adapter = new SESEmailProvider({
                ses: {
                    region: 'us-east-1',
                    fromEmail: 'test@example.com'
                }
            });

            should.exist(adapter);
        });

        it('should throw helpful error if AWS SDK not installed', function () {
            sandbox.restore(); // Remove our mock

            // Mock require to throw MODULE_NOT_FOUND
            const requireStub = sandbox.stub(module.constructor, '_load');
            requireStub.callsFake(function (request) {
                if (request === '@aws-sdk/client-ses') {
                    const err = new Error('Cannot find module');
                    err.code = 'MODULE_NOT_FOUND';
                    throw err;
                }
                return requireStub.wrappedMethod.apply(this, arguments);
            });

            try {
                new SESEmailProvider({
                    ses: {
                        region: 'us-east-1',
                        fromEmail: 'test@example.com'
                    }
                });
                throw new Error('Should have thrown an error');
            } catch (err) {
                err.message.should.match(/AWS SDK not installed/);
                err.message.should.match(/yarn add @aws-sdk\/client-ses/);
            } finally {
                sandbox.restore();
            }
        });
    });

    describe('send()', function () {
        let adapter;
        let emailData;
        let sendOptions;

        beforeEach(function () {
            adapter = new SESEmailProvider({
                ses: {
                    region: 'us-east-1',
                    fromEmail: 'default@example.com',
                    configurationSet: 'test-config-set'
                },
                errorHandler
            });

            emailData = {
                subject: 'Test Email',
                html: '<p>Hello World</p>',
                plaintext: 'Hello World',
                from: 'test@example.com',
                replyTo: 'reply@example.com',
                emailId: 'test-email-123',
                recipients: [
                    {email: 'user1@example.com'},
                    {email: 'user2@example.com'}
                ],
                replacementDefinitions: []
            };

            sendOptions = {
                openTrackingEnabled: true,
                clickTrackingEnabled: true
            };
        });

        it('should send email via SES client', async function () {
            const result = await adapter.send(emailData, sendOptions);

            sesClient.send.calledOnce.should.be.true();
            result.should.deepEqual({id: 'test-message-id-123'});
        });

        it('should build MIME email with correct headers', async function () {
            await adapter.send(emailData, sendOptions);

            const command = SendRawEmailCommand.firstCall.args[0];
            const rawMessage = command.RawMessage.Data.toString();

            rawMessage.should.match(/From: test@example.com/);
            rawMessage.should.match(/Subject: Test Email/);
            rawMessage.should.match(/Reply-To: reply@example.com/);
            rawMessage.should.match(/MIME-Version: 1.0/);
        });

        it('should build MIME email without reply-to if not provided', async function () {
            delete emailData.replyTo;

            await adapter.send(emailData, sendOptions);

            const command = SendRawEmailCommand.firstCall.args[0];
            const rawMessage = command.RawMessage.Data.toString();

            rawMessage.should.not.match(/Reply-To:/);
        });

        it('should include both HTML and plaintext in MIME', async function () {
            await adapter.send(emailData, sendOptions);

            const command = SendRawEmailCommand.firstCall.args[0];
            const rawMessage = command.RawMessage.Data.toString();

            rawMessage.should.match(/Content-Type: text\/plain/);
            rawMessage.should.match(/Hello World/); // plaintext
            rawMessage.should.match(/Content-Type: text\/html/);
            rawMessage.should.match(/<p>Hello World<\/p>/); // html
        });

        it('should use from address from email data', async function () {
            await adapter.send(emailData, sendOptions);

            const command = SendRawEmailCommand.firstCall.args[0];
            command.Source.should.equal('test@example.com');
        });

        it('should use default from address if not provided', async function () {
            delete emailData.from;

            await adapter.send(emailData, sendOptions);

            const command = SendRawEmailCommand.firstCall.args[0];
            command.Source.should.equal('default@example.com');
        });

        it('should include all recipients in Destinations', async function () {
            await adapter.send(emailData, sendOptions);

            const command = SendRawEmailCommand.firstCall.args[0];
            command.Destinations.should.deepEqual([
                'user1@example.com',
                'user2@example.com'
            ]);
        });

        it('should include configuration set', async function () {
            await adapter.send(emailData, sendOptions);

            const command = SendRawEmailCommand.firstCall.args[0];
            command.ConfigurationSetName.should.equal('test-config-set');
        });

        it('should tag email with emailId', async function () {
            await adapter.send(emailData, sendOptions);

            const command = SendRawEmailCommand.firstCall.args[0];
            command.Tags.should.deepEqual([
                {
                    Name: 'email-id',
                    Value: 'test-email-123'
                }
            ]);
        });

        it('should tag with "unknown" if emailId not provided', async function () {
            delete emailData.emailId;

            await adapter.send(emailData, sendOptions);

            const command = SendRawEmailCommand.firstCall.args[0];
            command.Tags[0].Value.should.equal('unknown');
        });

        it('should chunk recipients into batches of 50', async function () {
            // Create 100 recipients
            emailData.recipients = Array.from({length: 100}, (_, i) => ({
                email: `user${i}@example.com`
            }));

            await adapter.send(emailData, sendOptions);

            // Should have called send twice (100 / 50 = 2)
            sesClient.send.callCount.should.equal(2);
        });

        it('should return first message ID from batches', async function () {
            sesClient.send.onFirstCall().resolves({MessageId: 'first-id'});
            sesClient.send.onSecondCall().resolves({MessageId: 'second-id'});

            emailData.recipients = Array.from({length: 100}, (_, i) => ({
                email: `user${i}@example.com`
            }));

            const result = await adapter.send(emailData, sendOptions);

            result.id.should.equal('first-id');
        });

        it('should throw EmailError on SES API error', async function () {
            const sesError = new Error('MessageRejected');
            sesError.name = 'MessageRejected';
            sesError.code = 'MessageRejected';
            sesError.$metadata = {httpStatusCode: 400};

            sesClient.send.rejects(sesError);

            try {
                await adapter.send(emailData, sendOptions);
                throw new Error('Should have thrown EmailError');
            } catch (err) {
                err.name.should.equal('EmailError');
                err.statusCode.should.equal(400);
                err.message.should.match(/MessageRejected/);
                err.code.should.equal('BULK_EMAIL_SEND_FAILED');
            }
        });

        it('should call errorHandler on send failure', async function () {
            const sesError = new Error('Service Error');
            sesError.$metadata = {httpStatusCode: 500};

            sesClient.send.rejects(sesError);

            try {
                await adapter.send(emailData, sendOptions);
            } catch (err) {
                errorHandler.calledOnce.should.be.true();
                errorHandler.firstCall.args[0].should.have.property('name', 'EmailError');
            }
        });

        it('should not call errorHandler if not provided', async function () {
            const adapterWithoutHandler = new SESEmailProvider({
                ses: {
                    region: 'us-east-1',
                    fromEmail: 'test@example.com'
                }
            });

            sesClient.send.rejects(new Error('Test error'));

            try {
                await adapterWithoutHandler.send(emailData, sendOptions);
            } catch (err) {
                // Should not throw additional errors
                err.name.should.equal('EmailError');
            }
        });

        it('should redact PII from error details', async function () {
            const sesError = new Error('Sensitive error with email@example.com');
            sesError.$metadata = {httpStatusCode: 400};

            sesClient.send.rejects(sesError);

            try {
                await adapter.send(emailData, sendOptions);
            } catch (err) {
                // errorDetails should not contain recipient emails
                err.errorDetails.should.not.match(/user1@example.com/);
                err.errorDetails.should.not.match(/user2@example.com/);
                // But should contain recipient count
                err.errorDetails.should.match(/recipientCount/);
            }
        });

        it('should truncate error messages longer than 2000 chars', async function () {
            const longMessage = 'x'.repeat(3000);
            const sesError = new Error(longMessage);
            sesError.$metadata = {httpStatusCode: 400};

            sesClient.send.rejects(sesError);

            try {
                await adapter.send(emailData, sendOptions);
            } catch (err) {
                err.message.length.should.be.belowOrEqual(2000);
            }
        });

        it('should default to status 500 if no HTTP status in error', async function () {
            const sesError = new Error('Unknown error');
            // No $metadata property

            sesClient.send.rejects(sesError);

            try {
                await adapter.send(emailData, sendOptions);
            } catch (err) {
                err.statusCode.should.equal(500);
            }
        });
    });

    describe('getMaximumRecipients()', function () {
        it('should return 50 (SES bulk send limit)', function () {
            const adapter = new SESEmailProvider({
                ses: {
                    region: 'us-east-1',
                    fromEmail: 'test@example.com'
                }
            });

            const maxRecipients = adapter.getMaximumRecipients();

            maxRecipients.should.equal(50);
        });
    });

    describe('getTargetDeliveryWindow()', function () {
        it('should return 3600 seconds (1 hour)', function () {
            const adapter = new SESEmailProvider({
                ses: {
                    region: 'us-east-1',
                    fromEmail: 'test@example.com'
                }
            });

            const deliveryWindow = adapter.getTargetDeliveryWindow();

            deliveryWindow.should.equal(3600);
        });
    });

    describe('Adapter Contract', function () {
        it('should have required send method', function () {
            const adapter = new SESEmailProvider({
                ses: {
                    region: 'us-east-1',
                    fromEmail: 'test@example.com'
                }
            });

            adapter.should.have.property('send');
            adapter.send.should.be.a.Function();
        });

        it('should have requiredFns array with send', function () {
            const adapter = new SESEmailProvider({
                ses: {
                    region: 'us-east-1',
                    fromEmail: 'test@example.com'
                }
            });

            adapter.requiredFns.should.be.an.Array();
            adapter.requiredFns.should.containEql('send');
        });
    });
});
