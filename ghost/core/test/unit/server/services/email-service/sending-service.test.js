const sinon = require('sinon');
const assert = require('node:assert/strict');

const EmailBodyCache = require('../../../../../core/server/services/email-service/email-body-cache');
const SendingService = require('../../../../../core/server/services/email-service/sending-service');

describe('Sending service', function () {
    describe('send', function () {
        let emailProvider;
        let emailRenderer;
        let emailAddressService;
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

            emailAddressService = {
                fallbackDomain: undefined
            };
        });

        afterEach(function () {
            sinon.restore();
        });

        it('calls mailgun client with correct data', async function () {
            const sendingService = new SendingService({
                emailRenderer,
                emailProvider,
                emailAddressService
            });

            const deliveryTime = new Date();

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
                deliveryTime
            });
            assert.equal(response.id, 'provider-123');
            sinon.assert.calledOnce(sendStub);
            sinon.assert.calledWithMatch(sendStub,
                {
                    subject: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost+reply@example.com',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [{
                                id: 'name',
                                token: '{{name}}',
                                value: 'John'
                            }]
                        }
                    ],
                    emailId: '123',
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: sinon.match.func
                        }
                    ]
                },
                {
                    clickTrackingEnabled: true,
                    openTrackingEnabled: true,
                    deliveryTime
                }
            );
            // Verify domain is not included when useFallbackAddress is not set
            assert.equal(sendStub.getCall(0).args[0].domain, undefined);
        });

        it('calls mailgun client without the deliverytime if it is not defined', async function () {
            const sendingService = new SendingService({
                emailRenderer,
                emailProvider,
                emailAddressService
            });

            const deliveryTime = undefined;

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
                deliveryTime
            });
            assert.equal(response.id, 'provider-123');
            sinon.assert.calledOnce(sendStub);
            sinon.assert.calledWithMatch(sendStub,
                {
                    subject: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost+reply@example.com',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [{
                                id: 'name',
                                token: '{{name}}',
                                value: 'John'
                            }]
                        }
                    ],
                    emailId: '123',
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: sinon.match.func
                        }
                    ]
                },
                {
                    clickTrackingEnabled: true,
                    openTrackingEnabled: true
                }
            );
        });

        it('defaults to empty string if replacement returns undefined', async function () {
            const sendingService = new SendingService({
                emailRenderer,
                emailProvider,
                emailAddressService
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
            sinon.assert.calledWithMatch(sendStub,
                {
                    subject: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost+reply@example.com',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [{
                                id: 'name',
                                token: '{{name}}',
                                value: ''
                            }]
                        }
                    ],
                    emailId: '123',
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: sinon.match.func
                        }
                    ]
                },
                {
                    clickTrackingEnabled: true,
                    openTrackingEnabled: true
                }
            );
        });

        it('supports cache', async function () {
            const emailBodyCache = new EmailBodyCache();
            const sendingService = new SendingService({
                emailRenderer,
                emailProvider,
                emailAddressService
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
            sinon.assert.calledWithMatch(sendStub,
                {
                    subject: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost+reply@example.com',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [{
                                id: 'name',
                                token: '{{name}}',
                                value: 'John'
                            }]
                        }
                    ],
                    emailId: '123',
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: sinon.match.func
                        }
                    ]
                },
                {
                    clickTrackingEnabled: true,
                    openTrackingEnabled: true
                }
            );

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
            sinon.assert.calledWithMatch(sendStub.getCall(1),
                {
                    subject: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost+reply@example.com',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [{
                                id: 'name',
                                token: '{{name}}',
                                value: 'John'
                            }]
                        }
                    ],
                    emailId: '123',
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: sinon.match.func
                        }
                    ]
                },
                {
                    clickTrackingEnabled: true,
                    openTrackingEnabled: true
                }
            );

            // Didn't call renderBody again
            sinon.assert.calledOnce(emailRenderer.renderBody);
        });

        it('removes invalid recipients before sending', async function () {
            const sendingService = new SendingService({
                emailRenderer,
                emailProvider,
                emailAddressService
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
            sinon.assert.calledWithMatch(sendStub,
                {
                    subject: 'Hi',
                    from: 'ghost@example.com',
                    replyTo: 'ghost+reply@example.com',
                    html: '<html><body>Hi {{name}}</body></html>',
                    plaintext: 'Hi',
                    recipients: [
                        {
                            email: 'member@example.com',
                            replacements: [{
                                id: 'name',
                                token: '{{name}}',
                                value: 'John'
                            }]
                        }
                    ],
                    emailId: '123',
                    replacementDefinitions: [
                        {
                            id: 'name',
                            token: '{{name}}',
                            getValue: sinon.match.func
                        }
                    ]
                },
                {
                    clickTrackingEnabled: true,
                    openTrackingEnabled: true
                }
            );
        });

        it('maps null replyTo to undefined', async function () {
            const sendingService = new SendingService({
                emailRenderer,
                emailProvider,
                emailAddressService
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

        describe('fallback sending domain', function () {
            // Shared test data to reduce boilerplate
            const baseEmailData = {
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
            };

            const baseOptions = {
                clickTrackingEnabled: true,
                openTrackingEnabled: true
            };

            it('uses fallback domain when useFallbackAddress is true and fallback is configured', async function () {
                emailAddressService.fallbackDomain = 'fallback.example.com';

                const sendingService = new SendingService({
                    emailRenderer,
                    emailProvider,
                    emailAddressService
                });

                const response = await sendingService.send(
                    baseEmailData,
                    {...baseOptions, useFallbackAddress: true}
                );

                assert.equal(response.id, 'provider-123');
                sinon.assert.calledOnce(sendStub);

                // Verify getFromAddress was called with useFallbackAddress: true
                sinon.assert.calledWith(
                    emailRenderer.getFromAddress,
                    sinon.match.object,
                    sinon.match.object,
                    true
                );

                // Verify domain was passed to email provider
                sinon.assert.calledWithMatch(sendStub,
                    {
                        domainOverride: 'fallback.example.com'
                    },
                    {
                        clickTrackingEnabled: true,
                        openTrackingEnabled: true,
                        useFallbackAddress: true
                    }
                );
            });

            it('does not include domain when useFallbackAddress is false', async function () {
                emailAddressService.fallbackDomain = 'fallback.example.com';

                const sendingService = new SendingService({
                    emailRenderer,
                    emailProvider,
                    emailAddressService
                });

                const response = await sendingService.send(
                    baseEmailData,
                    {...baseOptions, useFallbackAddress: false}
                );

                assert.equal(response.id, 'provider-123');
                sinon.assert.calledOnce(sendStub);

                // Verify getFromAddress was called with useFallbackAddress: false
                sinon.assert.calledWith(
                    emailRenderer.getFromAddress,
                    sinon.match.object,
                    sinon.match.object,
                    false
                );

                // Verify domain was not included in the message
                assert.equal(sendStub.getCall(0).args[0].domain, undefined);
            });

            it('does not include domain when useFallbackAddress is true but fallback domain is not configured', async function () {
                emailAddressService.fallbackDomain = null;

                const sendingService = new SendingService({
                    emailRenderer,
                    emailProvider,
                    emailAddressService
                });

                const response = await sendingService.send(
                    baseEmailData,
                    {...baseOptions, useFallbackAddress: true}
                );

                assert.equal(response.id, 'provider-123');
                sinon.assert.calledOnce(sendStub);

                // Verify getFromAddress was still called with useFallbackAddress: true
                sinon.assert.calledWith(
                    emailRenderer.getFromAddress,
                    sinon.match.object,
                    sinon.match.object,
                    true
                );

                // Verify domain was not included (fallback not configured)
                assert.equal(sendStub.getCall(0).args[0].domainOverride, null);
            });

            it('defaults useFallbackAddress to false when not specified', async function () {
                emailAddressService.fallbackDomain = 'fallback.example.com';

                const sendingService = new SendingService({
                    emailRenderer,
                    emailProvider,
                    emailAddressService
                });

                const response = await sendingService.send(
                    baseEmailData,
                    baseOptions // useFallbackAddress not specified
                );

                assert.equal(response.id, 'provider-123');
                sinon.assert.calledOnce(sendStub);

                // Verify getFromAddress was called with false (default)
                sinon.assert.calledWith(
                    emailRenderer.getFromAddress,
                    sinon.match.object,
                    sinon.match.object,
                    false
                );

                // Verify useFallbackAddress defaults to false in options
                sinon.assert.calledWithMatch(sendStub,
                    sinon.match.object,
                    {
                        clickTrackingEnabled: true,
                        openTrackingEnabled: true,
                        useFallbackAddress: false
                    }
                );
            });
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

    describe('getTargetDeliveryWindow', function () {
        it('returns the target delivery window of the email provider', function () {
            const emailProvider = {
                getTargetDeliveryWindow: sinon.stub().returns(0)
            };
            const sendingService = new SendingService({
                emailProvider
            });
            assert.equal(sendingService.getTargetDeliveryWindow(), 0);
            sinon.assert.calledOnce(emailProvider.getTargetDeliveryWindow);
        });
    });
});
