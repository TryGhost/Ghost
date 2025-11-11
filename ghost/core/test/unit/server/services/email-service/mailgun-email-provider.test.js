const MailgunEmailProvider = require('../../../../../core/server/services/email-service/MailgunEmailProvider');
const sinon = require('sinon');
const should = require('should');
const assert = require('assert/strict');

describe('Mailgun Email Provider', function () {
    describe('send', function () {
        let mailgunClient;
        let sendStub;

        beforeEach(function () {
            sendStub = sinon.stub().resolves({
                id: 'provider-123'
            });

            mailgunClient = {
                send: sendStub
            };
        });

        afterEach(function () {
            sinon.restore();
        });

        it('calls mailgun client with correct data', async function () {
            const mailgunEmailProvider = new MailgunEmailProvider({
                mailgunClient,
                errorHandler: () => {}
            });

            const deliveryTime = new Date();

            const response = await mailgunEmailProvider.send({
                subject: 'Hi',
                html: '<html><body>Hi {{name}}</body></html>',
                plaintext: 'Hi',
                from: 'ghost@example.com',
                replyTo: 'ghost@example.com',
                emailId: '123',
                domainOverride: undefined,
                recipients: [
                    {
                        email: 'member@example.com',
                        replacements: [
                            {
                                id: 'name',
                                token: '{{name}}',
                                value: 'John'
                            }
                        ]
                    }
                ],
                replacementDefinitions: [
                    {
                        id: 'name',
                        token: '{{name}}',
                        getValue: () => 'John'
                    }
                ]
            }, {
                clickTrackingEnabled: true,
                openTrackingEnabled: true,
                deliveryTime
            });
            should(response.id).eql('provider-123');
            should(sendStub.calledOnce).be.true();
            sendStub.calledWith(
                {
                    subject: 'Hi',
                    html: '<html><body>Hi %recipient.name%</body></html>',
                    plaintext: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost@example.com',
                    id: '123',
                    domainOverride: undefined,
                    deliveryTime,
                    track_opens: true,
                    track_clicks: true
                },
                {'member@example.com': {name: 'John'}},
                []
            ).should.be.true();
        });

        it('handles mailgun client error correctly', async function () {
            const mailgunErr = new Error('Bad Request');
            mailgunErr.details = 'Invalid domain';
            mailgunErr.status = 400;
            sendStub = sinon.stub().throws({
                error: mailgunErr,
                messageData: {}
            });

            mailgunClient = {
                send: sendStub
            };

            const mailgunEmailProvider = new MailgunEmailProvider({
                mailgunClient,
                errorHandler: () => {}
            });
            try {
                const response = await mailgunEmailProvider.send({
                    subject: 'Hi',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost@example.com',
                    emailId: '123',
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [
                                {
                                    id: 'name',
                                    token: '{{name}}',
                                    value: 'John'
                                }
                            ]
                        }
                    ],
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: () => 'John'
                        }
                    ]
                }, {});
                should(response).be.undefined();
            } catch (e) {
                should(e.message).eql('Bad Request: Invalid domain');
                should(e.statusCode).eql(400);
                should(e.errorDetails).eql('{"error":{"details":"Invalid domain","status":400},"messageData":{}}');
            }
        });

        it('handles unknown error correctly', async function () {
            const mailgunErr = new Error('Unknown Error');
            sendStub = sinon.stub().throws(mailgunErr);

            mailgunClient = {
                send: sendStub
            };

            const mailgunEmailProvider = new MailgunEmailProvider({
                mailgunClient,
                errorHandler: () => {}
            });
            try {
                const response = await mailgunEmailProvider.send({
                    subject: 'Hi',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost@example.com',
                    emailId: '123',
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [
                                {
                                    id: 'name',
                                    token: '{{name}}',
                                    value: 'John'
                                }
                            ]
                        }
                    ],
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: () => 'John'
                        }
                    ]
                }, {});
                should(response).be.undefined();
            } catch (e) {
                should(e.message).eql('Unknown Error');
                should(e.errorDetails).eql(undefined);
            }
        });

        it('handles empty error correctly', async function () {
            const mailgunErr = new Error('');
            sendStub = sinon.stub().throws(mailgunErr);

            mailgunClient = {
                send: sendStub
            };

            const mailgunEmailProvider = new MailgunEmailProvider({
                mailgunClient,
                errorHandler: () => {}
            });
            try {
                const response = await mailgunEmailProvider.send({
                    subject: 'Hi',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost@example.com',
                    emailId: '123',
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [
                                {
                                    id: 'name',
                                    token: '{{name}}',
                                    value: 'John'
                                }
                            ]
                        }
                    ],
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: () => 'John'
                        }
                    ]
                }, {});
                should(response).be.undefined();
            } catch (e) {
                should(e.message).eql('Mailgun Error');
                should(e.errorDetails).eql(undefined);
            }
        });
    });

    describe('getMaximumRecipients', function () {
        let mailgunClient;
        let getBatchSizeStub;

        it('returns 1000', function () {
            getBatchSizeStub = sinon.stub().returns(1000);

            mailgunClient = {
                getBatchSize: getBatchSizeStub
            };

            const provider = new MailgunEmailProvider({
                mailgunClient,
                errorHandler: () => {}
            });
            assert.equal(provider.getMaximumRecipients(), 1000);
        });
    });

    describe('getTargetDeliveryWindow', function () {
        let mailgunClient;
        let getTargetDeliveryWindowStub;

        it('returns the configured target delivery window', function () {
            getTargetDeliveryWindowStub = sinon.stub().returns(0);

            mailgunClient = {
                getTargetDeliveryWindow: getTargetDeliveryWindowStub
            };

            const provider = new MailgunEmailProvider({
                mailgunClient,
                errorHandler: () => {}
            });
            assert.equal(provider.getTargetDeliveryWindow(), 0);
        });
    });

    describe('rate limit error handling', function () {
        let mailgunClient;
        let sendStub;

        beforeEach(function () {
            sendStub = sinon.stub();
            mailgunClient = {
                send: sendStub
            };
        });

        afterEach(function () {
            sinon.restore();
        });

        it('detects 429 status as rate limit error', async function () {
            const mailgunErr = new Error('Too Many Requests');
            mailgunErr.details = 'You have exceeded your rate limit';
            mailgunErr.status = 429;
            mailgunErr.headers = {
                'retry-after': '3600'
            };

            sendStub.throws({
                error: mailgunErr,
                messageData: {}
            });

            const provider = new MailgunEmailProvider({
                mailgunClient,
                errorHandler: () => {}
            });

            try {
                await provider.send({
                    subject: 'Test',
                    html: '<html><body>Test</body></html>',
                    plaintext: 'Test',
                    from: 'test@example.com',
                    replyTo: 'test@example.com',
                    emailId: '123',
                    recipients: [{email: 'test@example.com', replacements: []}],
                    replacementDefinitions: []
                }, {});
                should.fail('Should have thrown an error');
            } catch (e) {
                should(e.code).eql('BULK_EMAIL_RATE_LIMIT');
                should(e.retryAfterSeconds).eql(3600);
                should(e.isRateLimit).be.true();
                should(e.statusCode).eql(429);
            }
        });

        it('detects 402 status as rate limit error', async function () {
            const mailgunErr = new Error('Payment Required');
            mailgunErr.details = 'You have reached your sending quota';
            mailgunErr.status = 402;

            sendStub.throws({
                error: mailgunErr,
                messageData: {}
            });

            const provider = new MailgunEmailProvider({
                mailgunClient,
                errorHandler: () => {}
            });

            try {
                await provider.send({
                    subject: 'Test',
                    html: '<html><body>Test</body></html>',
                    plaintext: 'Test',
                    from: 'test@example.com',
                    replyTo: 'test@example.com',
                    emailId: '123',
                    recipients: [{email: 'test@example.com', replacements: []}],
                    replacementDefinitions: []
                }, {});
                should.fail('Should have thrown an error');
            } catch (e) {
                should(e.code).eql('BULK_EMAIL_RATE_LIMIT');
                should(e.isRateLimit).be.true();
                should(e.statusCode).eql(402);
            }
        });

        it('detects rate limit keywords in error message', async function () {
            const mailgunErr = new Error('Bad Request');
            mailgunErr.details = 'Your account has exceeded the daily rate limit';
            mailgunErr.status = 400;

            sendStub.throws({
                error: mailgunErr,
                messageData: {}
            });

            const provider = new MailgunEmailProvider({
                mailgunClient,
                errorHandler: () => {}
            });

            try {
                await provider.send({
                    subject: 'Test',
                    html: '<html><body>Test</body></html>',
                    plaintext: 'Test',
                    from: 'test@example.com',
                    replyTo: 'test@example.com',
                    emailId: '123',
                    recipients: [{email: 'test@example.com', replacements: []}],
                    replacementDefinitions: []
                }, {});
                should.fail('Should have thrown an error');
            } catch (e) {
                should(e.code).eql('BULK_EMAIL_RATE_LIMIT');
                should(e.isRateLimit).be.true();
            }
        });

        it('parses x-ratelimit-reset header', async function () {
            const mailgunErr = new Error('Too Many Requests');
            mailgunErr.details = 'Rate limit exceeded';
            mailgunErr.status = 429;
            const resetTime = Math.floor(Date.now() / 1000) + 1800; // 30 minutes from now
            mailgunErr.headers = {
                'x-ratelimit-reset': resetTime.toString()
            };

            sendStub.throws({
                error: mailgunErr,
                messageData: {}
            });

            const provider = new MailgunEmailProvider({
                mailgunClient,
                errorHandler: () => {}
            });

            try {
                await provider.send({
                    subject: 'Test',
                    html: '<html><body>Test</body></html>',
                    plaintext: 'Test',
                    from: 'test@example.com',
                    replyTo: 'test@example.com',
                    emailId: '123',
                    recipients: [{email: 'test@example.com', replacements: []}],
                    replacementDefinitions: []
                }, {});
                should.fail('Should have thrown an error');
            } catch (e) {
                should(e.retryAfterSeconds).be.approximately(1800, 5);
            }
        });

        it('determines limit type from error message - daily', async function () {
            const mailgunErr = new Error('Rate Limit');
            mailgunErr.details = 'Daily sending limit exceeded';
            mailgunErr.status = 429;

            sendStub.throws({
                error: mailgunErr,
                messageData: {}
            });

            const provider = new MailgunEmailProvider({
                mailgunClient,
                errorHandler: () => {}
            });

            try {
                await provider.send({
                    subject: 'Test',
                    html: '<html><body>Test</body></html>',
                    plaintext: 'Test',
                    from: 'test@example.com',
                    replyTo: 'test@example.com',
                    emailId: '123',
                    recipients: [{email: 'test@example.com', replacements: []}],
                    replacementDefinitions: []
                }, {});
                should.fail('Should have thrown an error');
            } catch (e) {
                should(e.limitType).eql('day');
            }
        });

        it('determines limit type from error message - hourly', async function () {
            const mailgunErr = new Error('Rate Limit');
            mailgunErr.details = 'Hourly rate limit exceeded';
            mailgunErr.status = 429;

            sendStub.throws({
                error: mailgunErr,
                messageData: {}
            });

            const provider = new MailgunEmailProvider({
                mailgunClient,
                errorHandler: () => {}
            });

            try {
                await provider.send({
                    subject: 'Test',
                    html: '<html><body>Test</body></html>',
                    plaintext: 'Test',
                    from: 'test@example.com',
                    replyTo: 'test@example.com',
                    emailId: '123',
                    recipients: [{email: 'test@example.com', replacements: []}],
                    replacementDefinitions: []
                }, {});
                should.fail('Should have thrown an error');
            } catch (e) {
                should(e.limitType).eql('hour');
            }
        });

        it('does not treat non-rate-limit errors as rate limits', async function () {
            const mailgunErr = new Error('Bad Request');
            mailgunErr.details = 'Invalid email address';
            mailgunErr.status = 400;

            sendStub.throws({
                error: mailgunErr,
                messageData: {}
            });

            const provider = new MailgunEmailProvider({
                mailgunClient,
                errorHandler: () => {}
            });

            try {
                await provider.send({
                    subject: 'Test',
                    html: '<html><body>Test</body></html>',
                    plaintext: 'Test',
                    from: 'test@example.com',
                    replyTo: 'test@example.com',
                    emailId: '123',
                    recipients: [{email: 'test@example.com', replacements: []}],
                    replacementDefinitions: []
                }, {});
                should.fail('Should have thrown an error');
            } catch (e) {
                should(e.code).eql('BULK_EMAIL_SEND_FAILED');
                should(e.isRateLimit).be.undefined();
            }
        });
    });
});
