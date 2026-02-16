const MailgunEmailProvider = require('../../../../../core/server/services/email-service/mailgun-email-provider');
const sinon = require('sinon');
const assert = require('node:assert/strict');

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
            assert.equal(response.id, 'provider-123');
            sinon.assert.calledOnce(sendStub);
            sinon.assert.calledWith(sendStub,
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
            );
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
            await assert.rejects(async () => {
                await mailgunEmailProvider.send({
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
                assert.fail();
            }, {
                message: 'Bad Request: Invalid domain',
                statusCode: 400,
                errorDetails: '{"error":{"details":"Invalid domain","status":400},"messageData":{}}'
            });
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
            await assert.rejects(async () => {
                await mailgunEmailProvider.send({
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
                assert.fail();
            }, {
                message: 'Unknown Error',
                errorDetails: undefined
            });
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
            await assert.rejects(async () => {
                await mailgunEmailProvider.send({
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
                assert.fail();
            }, {
                message: 'Mailgun Error',
                errorDetails: undefined
            });
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
});
