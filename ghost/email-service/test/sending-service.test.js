const SendingService = require('../lib/SendingService');
const sinon = require('sinon');
const assert = require('assert');
const EmailBodyCache = require('../lib/EmailBodyCache');

describe('Sending service', function () {
    describe('send', function () {
        let emailProvider;
        let emailRenderer;
        let sendStub;
        let replyTo;

        beforeEach(function () {
            sendStub = sinon.stub().resolves({
                id: 'provider-123'
            });

            replyTo = 'ghost+reply@example.com';

            emailRenderer = {
                renderBody: sinon.stub().resolves({
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    replacements: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: (member) => {
                                return member.name;
                            }
                        }
                    ]
                }),
                getSubject: sinon.stub().returns('Hi'),
                getFromAddress: sinon.stub().returns('ghost@example.com'),
                getReplyToAddress: () => {
                    return replyTo;
                }
            };

            emailProvider = {
                send: sendStub
            };
        });

        afterEach(function () {
            sinon.restore();
        });

        it('calls mailgun client with correct data', async function () {
            const sendingService = new SendingService({
                emailRenderer,
                emailProvider
            });

            const response = await sendingService.send({
                post: {},
                newsletter: {},
                segment: null,
                emailId: '123',
                members: [
                    {
                        email: 'member@example.com',
                        name: 'John'
                    }
                ]
            }, {
                clickTrackingEnabled: true,
                openTrackingEnabled: true
            });
            assert.equal(response.id, 'provider-123');
            sinon.assert.calledOnce(sendStub);
            assert(sendStub.calledWith(
                {
                    subject: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost+reply@example.com',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    emailId: '123',
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: sinon.match.func
                        }
                    ],
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [{
                                id: 'name',
                                token: '{{name}}',
                                value: 'John'
                            }]
                        }
                    ]
                },
                {
                    clickTrackingEnabled: true,
                    openTrackingEnabled: true
                }
            ));
        });

        it('defaults to empty string if replacement returns undefined', async function () {
            const sendingService = new SendingService({
                emailRenderer,
                emailProvider
            });

            const response = await sendingService.send({
                post: {},
                newsletter: {},
                segment: null,
                emailId: '123',
                members: [
                    {
                        email: 'member@example.com',
                        name: undefined
                    }
                ]
            }, {
                clickTrackingEnabled: true,
                openTrackingEnabled: true
            });
            assert.equal(response.id, 'provider-123');
            sinon.assert.calledOnce(sendStub);
            assert(sendStub.calledWith(
                {
                    subject: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost+reply@example.com',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    emailId: '123',
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: sinon.match.func
                        }
                    ],
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [{
                                id: 'name',
                                token: '{{name}}',
                                value: ''
                            }]
                        }
                    ]
                },
                {
                    clickTrackingEnabled: true,
                    openTrackingEnabled: true
                }
            ));
        });

        it('supports cache', async function () {
            const emailBodyCache = new EmailBodyCache();
            const sendingService = new SendingService({
                emailRenderer,
                emailProvider
            });

            const response = await sendingService.send({
                post: {},
                newsletter: {},
                segment: null,
                emailId: '123',
                members: [
                    {
                        email: 'member@example.com',
                        name: 'John'
                    }
                ]
            }, {
                clickTrackingEnabled: true,
                openTrackingEnabled: true,
                emailBodyCache
            });
            assert.equal(response.id, 'provider-123');
            sinon.assert.calledOnce(sendStub);
            sinon.assert.calledOnce(emailRenderer.renderBody);
            assert(sendStub.calledWith(
                {
                    subject: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost+reply@example.com',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    emailId: '123',
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: sinon.match.func
                        }
                    ],
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [{
                                id: 'name',
                                token: '{{name}}',
                                value: 'John'
                            }]
                        }
                    ]
                },
                {
                    clickTrackingEnabled: true,
                    openTrackingEnabled: true
                }
            ));

            // Do again and see if cache is used
            const response2 = await sendingService.send({
                post: {},
                newsletter: {},
                segment: null,
                emailId: '123',
                members: [
                    {
                        email: 'member@example.com',
                        name: 'John'
                    }
                ]
            }, {
                clickTrackingEnabled: true,
                openTrackingEnabled: true,
                emailBodyCache
            });
            assert.equal(response2.id, 'provider-123');
            sinon.assert.calledTwice(sendStub);
            assert(sendStub.getCall(1).calledWith(
                {
                    subject: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost+reply@example.com',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    emailId: '123',
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: sinon.match.func
                        }
                    ],
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [{
                                id: 'name',
                                token: '{{name}}',
                                value: 'John'
                            }]
                        }
                    ]
                },
                {
                    clickTrackingEnabled: true,
                    openTrackingEnabled: true
                }
            ));

            // Didn't call renderBody again
            sinon.assert.calledOnce(emailRenderer.renderBody);
        });

        it('removes invalid recipients before sending', async function () {
            const sendingService = new SendingService({
                emailRenderer,
                emailProvider
            });

            const response = await sendingService.send({
                post: {},
                newsletter: {},
                segment: null,
                emailId: '123',
                members: [
                    {
                        email: 'member@example.com',
                        name: 'John'
                    },
                    {
                        email: 'member+invalid@example.com�',
                        name: 'John'
                    }
                ]
            }, {
                clickTrackingEnabled: true,
                openTrackingEnabled: true
            });
            assert.equal(response.id, 'provider-123');
            sinon.assert.calledOnce(sendStub);
            assert(sendStub.calledWith(
                {
                    subject: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost+reply@example.com',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    emailId: '123',
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: sinon.match.func
                        }
                    ],
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [{
                                id: 'name',
                                token: '{{name}}',
                                value: 'John'
                            }]
                        }
                    ]
                },
                {
                    clickTrackingEnabled: true,
                    openTrackingEnabled: true
                }
            ));
        });

        it('maps null replyTo to undefined', async function () {
            const sendingService = new SendingService({
                emailRenderer,
                emailProvider
            });

            replyTo = null;
            const response = await sendingService.send({
                post: {},
                newsletter: {},
                segment: null,
                emailId: '123',
                members: [
                    {
                        email: 'member@example.com',
                        name: 'John'
                    }
                ]
            }, {
                clickTrackingEnabled: true,
                openTrackingEnabled: true
            });
            assert.equal(response.id, 'provider-123');
            sinon.assert.calledOnce(sendStub);
            const firstCall = sendStub.getCall(0);
            assert.equal(firstCall.args[0].replyTo, undefined);
        });
    });

    describe('getMaximumRecipients', function () {
        it('returns maximum recipients of email provider', function () {
            const emailProvider = {
                getMaximumRecipients: sinon.stub().returns(12)
            };
            const sendingService = new SendingService({
                emailProvider
            });
            assert.equal(sendingService.getMaximumRecipients(), 12);
            sinon.assert.calledOnce(emailProvider.getMaximumRecipients);
        });
    });
});
