const SendingService = require('../lib/sending-service');
const sinon = require('sinon');
const should = require('should');

describe('Sending service', function () {
    describe('send', function () {
        let emailProvider;
        let emailRenderer;
        let sendStub;

        beforeEach(function () {
            sendStub = sinon.stub().resolves({
                id: 'provider-123'
            });

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
                getReplyToAddress: sinon.stub().returns('ghost+reply@example.com')
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
            should(response.id).eql('provider-123');
            should(sendStub.calledOnce).be.true();
            sendStub.calledWith(
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
            ).should.be.true();
        });
    });
});
