const should = require('should');
const sinon = require('sinon');
const MailgunEmailProvider = require('../../../../../../core/server/adapters/email/mailgun');
const EmailProviderBase = require('../../../../../../core/server/adapters/email/EmailProviderBase');

describe('Mailgun Email Provider Adapter', function () {
    let mailgunClient;
    let errorHandler;
    let sandbox;

    beforeEach(function () {
        sandbox = sinon.createSandbox();

        // Mock mailgun client
        mailgunClient = {
            send: sandbox.stub().resolves({id: '<test-message-id@mailgun.net>'}),
            getBatchSize: sandbox.stub().returns(1000),
            getTargetDeliveryWindow: sandbox.stub().returns(10000)
        };

        errorHandler = sandbox.stub();
    });

    afterEach(function () {
        sandbox.restore();
    });

    describe('Constructor', function () {
        it('should extend EmailProviderBase', function () {
            const adapter = new MailgunEmailProvider({
                mailgunClient
            });

            should.exist(adapter);
            adapter.should.be.instanceOf(EmailProviderBase);
        });

        it('should store mailgunClient from config', function () {
            const adapter = new MailgunEmailProvider({
                mailgunClient,
                errorHandler
            });

            should.exist(adapter);
            // Private fields can't be tested directly, but we can verify through methods
            adapter.getMaximumRecipients().should.equal(1000);
        });

        it('should store errorHandler from config', function () {
            const adapter = new MailgunEmailProvider({
                mailgunClient,
                errorHandler
            });

            should.exist(adapter);
            // Error handler will be tested in send() error cases
        });

        it('should throw error if mailgunClient is missing', function () {
            try {
                new MailgunEmailProvider({});
                throw new Error('Should have thrown an error');
            } catch (err) {
                err.message.should.match(/Mailgun adapter requires mailgunClient/);
            }
        });

        it('should work without errorHandler (optional)', function () {
            const adapter = new MailgunEmailProvider({
                mailgunClient
            });

            should.exist(adapter);
        });
    });

    describe('send()', function () {
        let adapter;
        let emailData;
        let sendOptions;

        beforeEach(function () {
            adapter = new MailgunEmailProvider({
                mailgunClient,
                errorHandler
            });

            emailData = {
                subject: 'Test Email',
                html: '<p>Hello {{name}}</p>',
                plaintext: 'Hello {{name}}',
                from: 'test@example.com',
                replyTo: 'reply@example.com',
                emailId: 'test-email-123',
                recipients: [
                    {
                        email: 'user1@example.com',
                        replacements: [
                            {id: 'name', value: 'User 1'}
                        ]
                    },
                    {
                        email: 'user2@example.com',
                        replacements: [
                            {id: 'name', value: 'User 2'}
                        ]
                    }
                ],
                replacementDefinitions: [
                    {token: '{{name}}', id: 'name'}
                ]
            };

            sendOptions = {
                openTrackingEnabled: true,
                clickTrackingEnabled: true
            };
        });

        it('should send email via mailgun client', async function () {
            const result = await adapter.send(emailData, sendOptions);

            mailgunClient.send.calledOnce.should.be.true();
            result.should.deepEqual({id: 'test-message-id@mailgun.net'});
        });

        it('should pass correct message data to mailgun client', async function () {
            await adapter.send(emailData, sendOptions);

            const messageData = mailgunClient.send.firstCall.args[0];

            messageData.subject.should.equal('Test Email');
            messageData.from.should.equal('test@example.com');
            messageData.replyTo.should.equal('reply@example.com');
            messageData.id.should.equal('test-email-123');
            messageData.track_opens.should.be.true();
            messageData.track_clicks.should.be.true();
        });

        it('should convert replacement tokens to Mailgun variable syntax', async function () {
            await adapter.send(emailData, sendOptions);

            const messageData = mailgunClient.send.firstCall.args[0];

            // Should replace {{name}} with %recipient.name%
            messageData.html.should.equal('<p>Hello %recipient.name%</p>');
            messageData.plaintext.should.equal('Hello %recipient.name%');
        });

        it('should create recipient data for Mailgun', async function () {
            await adapter.send(emailData, sendOptions);

            const recipientData = mailgunClient.send.firstCall.args[1];

            recipientData['user1@example.com'].should.deepEqual({name: 'User 1'});
            recipientData['user2@example.com'].should.deepEqual({name: 'User 2'});
        });

        it('should pass empty replacements array to client', async function () {
            // Adapter pre-processes replacements into Mailgun format
            await adapter.send(emailData, sendOptions);

            const replacements = mailgunClient.send.firstCall.args[2];

            replacements.should.deepEqual([]);
        });

        it('should handle deliveryTime option', async function () {
            const deliveryTime = new Date('2025-12-01T10:00:00Z');
            sendOptions.deliveryTime = deliveryTime;

            await adapter.send(emailData, sendOptions);

            const messageData = mailgunClient.send.firstCall.args[0];
            messageData.deliveryTime.should.equal(deliveryTime);
        });

        it('should not include deliveryTime if not provided', async function () {
            await adapter.send(emailData, sendOptions);

            const messageData = mailgunClient.send.firstCall.args[0];
            should.not.exist(messageData.deliveryTime);
        });

        it('should handle disabled tracking options', async function () {
            sendOptions.openTrackingEnabled = false;
            sendOptions.clickTrackingEnabled = false;

            await adapter.send(emailData, sendOptions);

            const messageData = mailgunClient.send.firstCall.args[0];
            messageData.track_opens.should.be.false();
            messageData.track_clicks.should.be.false();
        });

        it('should trim angle brackets from mailgun message ID', async function () {
            mailgunClient.send.resolves({id: '<test-123@mailgun.net>'});

            const result = await adapter.send(emailData, sendOptions);

            result.id.should.equal('test-123@mailgun.net');
        });

        it('should throw EmailError on mailgun API error', async function () {
            const mailgunError = {
                error: {
                    status: 400,
                    message: 'Bad Request',
                    details: 'Invalid recipient email'
                },
                messageData: emailData
            };

            mailgunClient.send.rejects(mailgunError);

            try {
                await adapter.send(emailData, sendOptions);
                throw new Error('Should have thrown EmailError');
            } catch (err) {
                err.name.should.equal('EmailError');
                err.statusCode.should.equal(400);
                err.message.should.match(/Bad Request/);
                err.code.should.equal('BULK_EMAIL_SEND_FAILED');
            }
        });

        it('should call errorHandler on send failure', async function () {
            const mailgunError = {
                error: {
                    status: 500,
                    message: 'Server Error'
                },
                messageData: emailData
            };

            mailgunClient.send.rejects(mailgunError);

            try {
                await adapter.send(emailData, sendOptions);
            } catch (err) {
                errorHandler.calledOnce.should.be.true();
                errorHandler.firstCall.args[0].should.have.property('name', 'EmailError');
            }
        });

        it('should handle generic errors without mailgun error structure', async function () {
            mailgunClient.send.rejects(new Error('Network timeout'));

            try {
                await adapter.send(emailData, sendOptions);
                throw new Error('Should have thrown EmailError');
            } catch (err) {
                err.name.should.equal('EmailError');
                err.message.should.match(/Network timeout/);
                err.code.should.equal('BULK_EMAIL_SEND_FAILED');
            }
        });

        it('should not call errorHandler if not provided', async function () {
            const adapterWithoutHandler = new MailgunEmailProvider({
                mailgunClient
            });

            mailgunClient.send.rejects(new Error('Test error'));

            try {
                await adapterWithoutHandler.send(emailData, sendOptions);
            } catch (err) {
                // Should not throw additional errors
                err.name.should.equal('EmailError');
            }
        });

        it('should truncate error messages longer than 2000 chars', async function () {
            const longMessage = 'x'.repeat(3000);
            const mailgunError = {
                error: {
                    status: 400,
                    message: longMessage
                },
                messageData: emailData
            };

            mailgunClient.send.rejects(mailgunError);

            try {
                await adapter.send(emailData, sendOptions);
            } catch (err) {
                err.message.length.should.be.belowOrEqual(2000);
            }
        });
    });

    describe('getMaximumRecipients()', function () {
        it('should return batch size from mailgun client', function () {
            const adapter = new MailgunEmailProvider({
                mailgunClient
            });

            const maxRecipients = adapter.getMaximumRecipients();

            maxRecipients.should.equal(1000);
            mailgunClient.getBatchSize.calledOnce.should.be.true();
        });
    });

    describe('getTargetDeliveryWindow()', function () {
        it('should return target delivery window from mailgun client', function () {
            const adapter = new MailgunEmailProvider({
                mailgunClient
            });

            const deliveryWindow = adapter.getTargetDeliveryWindow();

            deliveryWindow.should.equal(10000);
            mailgunClient.getTargetDeliveryWindow.calledOnce.should.be.true();
        });
    });

    describe('Adapter Contract', function () {
        it('should have required send method', function () {
            const adapter = new MailgunEmailProvider({
                mailgunClient
            });

            adapter.should.have.property('send');
            adapter.send.should.be.a.Function();
        });

        it('should have requiredFns array with send', function () {
            const adapter = new MailgunEmailProvider({
                mailgunClient
            });

            adapter.requiredFns.should.be.an.Array();
            adapter.requiredFns.should.containEql('send');
        });
    });
});
