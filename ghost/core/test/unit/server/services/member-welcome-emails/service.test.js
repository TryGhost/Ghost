const sinon = require('sinon');
const should = require('should');
const rewire = require('rewire');
const errors = require('@tryghost/errors');

describe('MemberWelcomeEmailService', function () {
    let serviceModule;
    let loggingStub;
    let configStub;
    let settingsCacheStub;
    let urlUtilsStub;
    let emailAddressServiceStub;
    let mailStub;
    let mailerSendStub;
    let rendererRenderStub;
    let automatedEmailStub;

    beforeEach(function () {
        loggingStub = {info: sinon.stub()};
        configStub = {get: sinon.stub()};
        settingsCacheStub = {get: sinon.stub()};
        urlUtilsStub = {
            urlFor: sinon.stub().returns('https://example.com/')
        };
        emailAddressServiceStub = {init: sinon.stub()};

        mailerSendStub = sinon.stub().resolves();
        mailStub = {
            GhostMailer: sinon.stub().returns({
                send: mailerSendStub
            })
        };

        rendererRenderStub = sinon.stub().resolves({
            html: '<html>Test</html>',
            text: 'Test',
            subject: 'Welcome!'
        });

        const MockRenderer = sinon.stub().returns({
            render: rendererRenderStub
        });

        automatedEmailStub = {
            findOne: sinon.stub().resolves({
                get: sinon.stub().callsFake((key) => {
                    const data = {
                        lexical: '{"root":{}}',
                        subject: 'Welcome to {{site.title}}',
                        sender_name: 'Test',
                        sender_email: 'test@example.com',
                        sender_reply_to: 'reply@example.com'
                    };
                    return data[key];
                })
            })
        };

        serviceModule = rewire('../../../../../core/server/services/member-welcome-emails/service');
        serviceModule.__set__('logging', loggingStub);
        serviceModule.__set__('config', configStub);
        serviceModule.__set__('settingsCache', settingsCacheStub);
        serviceModule.__set__('urlUtils', urlUtilsStub);
        serviceModule.__set__('emailAddressService', emailAddressServiceStub);
        serviceModule.__set__('mail', mailStub);
        serviceModule.__set__('MemberWelcomeEmailRenderer', MockRenderer);
        serviceModule.__set__('AutomatedEmail', automatedEmailStub);
    });

    afterEach(function () {
        sinon.restore();
    });

    describe('init', function () {
        it('creates api instance on first call', function () {
            should.not.exist(serviceModule.api);

            serviceModule.init();

            should.exist(serviceModule.api);
        });

        it('does not recreate api instance on subsequent calls', function () {
            serviceModule.init();
            const firstApi = serviceModule.api;

            serviceModule.init();

            serviceModule.api.should.equal(firstApi);
        });
    });

    describe('loadTemplate', function () {
        it('loads template from AutomatedEmail model by slug', async function () {
            serviceModule.init();
            await serviceModule.api.loadTemplate();

            sinon.assert.calledOnce(automatedEmailStub.findOne);
            sinon.assert.calledWith(automatedEmailStub.findOne, {slug: 'member-welcome-email-free'});
        });

        it('sets template to null when no template found', async function () {
            automatedEmailStub.findOne.resolves(null);

            serviceModule.api = null;
            serviceModule.init();
            await serviceModule.api.loadTemplate();

            configStub.get.withArgs('memberWelcomeEmailTestInbox').returns('test@example.com');
            await serviceModule.api.send({
                member: {name: 'John', email: 'john@example.com'}
            }).should.be.rejectedWith(errors.IncorrectUsageError);
        });

        it('sets template to null when lexical is empty', async function () {
            automatedEmailStub.findOne.resolves({
                get: sinon.stub().callsFake((key) => {
                    if (key === 'lexical') {
                        return null;
                    }
                    return 'value';
                })
            });

            serviceModule.api = null;
            serviceModule.init();
            await serviceModule.api.loadTemplate();

            configStub.get.withArgs('memberWelcomeEmailTestInbox').returns('test@example.com');
            await serviceModule.api.send({
                member: {name: 'John', email: 'john@example.com'}
            }).should.be.rejectedWith(errors.IncorrectUsageError);
        });

        it('extracts template fields using model get method', async function () {
            const mockGet = sinon.stub().callsFake((key) => {
                const data = {
                    lexical: '{"root":{}}',
                    subject: 'Welcome!',
                    sender_name: 'Sender',
                    sender_email: 'sender@example.com',
                    sender_reply_to: 'reply@example.com'
                };
                return data[key];
            });

            automatedEmailStub.findOne.resolves({get: mockGet});

            serviceModule.api = null;
            serviceModule.init();
            await serviceModule.api.loadTemplate();

            sinon.assert.calledWith(mockGet, 'lexical');
            sinon.assert.calledWith(mockGet, 'subject');
            sinon.assert.calledWith(mockGet, 'sender_name');
            sinon.assert.calledWith(mockGet, 'sender_email');
            sinon.assert.calledWith(mockGet, 'sender_reply_to');
        });
    });

    describe('send', function () {
        beforeEach(function () {
            configStub.get.withArgs('memberWelcomeEmailTestInbox').returns('test-inbox@example.com');
            settingsCacheStub.get.withArgs('title').returns('My Site');
            settingsCacheStub.get.withArgs('accent_color').returns('#00ff00');
        });

        it('throws IncorrectUsageError when no template loaded', async function () {
            serviceModule.api = null;
            serviceModule.init();

            await serviceModule.api.send({
                member: {name: 'John', email: 'john@example.com'}
            }).should.be.rejectedWith(errors.IncorrectUsageError, {
                message: 'No email template found for member welcome email'
            });
        });

        it('calls renderer with correct member and site settings', async function () {
            serviceModule.api = null;
            serviceModule.init();
            await serviceModule.api.loadTemplate();

            await serviceModule.api.send({
                member: {name: 'John Doe', email: 'john@example.com'}
            });

            sinon.assert.calledOnce(rendererRenderStub);

            const renderCall = rendererRenderStub.getCall(0);
            renderCall.args[0].member.should.deepEqual({
                name: 'John Doe',
                email: 'john@example.com'
            });
            renderCall.args[0].siteSettings.title.should.equal('My Site');
            renderCall.args[0].siteSettings.url.should.equal('https://example.com/');
            renderCall.args[0].siteSettings.accentColor.should.equal('#00ff00');
        });

        it('sends email via mailer with correct parameters', async function () {
            serviceModule.api = null;
            serviceModule.init();
            await serviceModule.api.loadTemplate();

            await serviceModule.api.send({
                member: {name: 'John', email: 'john@example.com'}
            });

            sinon.assert.calledOnce(mailerSendStub);
            sinon.assert.calledWith(mailerSendStub, {
                to: 'test-inbox@example.com',
                subject: 'Welcome!',
                html: '<html>Test</html>',
                text: 'Test',
                forceTextContent: true
            });
        });

        it('uses memberWelcomeEmailTestInbox config for recipient', async function () {
            configStub.get.withArgs('memberWelcomeEmailTestInbox').returns('custom-inbox@example.com');

            serviceModule.api = null;
            serviceModule.init();
            await serviceModule.api.loadTemplate();

            await serviceModule.api.send({
                member: {name: 'John', email: 'john@example.com'}
            });

            const sendCall = mailerSendStub.getCall(0);
            sendCall.args[0].to.should.equal('custom-inbox@example.com');
        });

        it('throws error when memberWelcomeEmailTestInbox config missing', async function () {
            configStub.get.withArgs('memberWelcomeEmailTestInbox').returns(undefined);

            serviceModule.api = null;
            serviceModule.init();
            await serviceModule.api.loadTemplate();

            await serviceModule.api.send({
                member: {name: 'John', email: 'john@example.com'}
            }).should.be.rejectedWith(errors.IncorrectUsageError, {
                message: 'memberWelcomeEmailTestInbox config is required but not defined'
            });
        });

        it('logs info message with member name and email', async function () {
            serviceModule.api = null;
            serviceModule.init();
            await serviceModule.api.loadTemplate();

            await serviceModule.api.send({
                member: {name: 'John', email: 'john@example.com'}
            });

            sinon.assert.calledOnce(loggingStub.info);
            const logMessage = loggingStub.info.getCall(0).args[0];
            logMessage.should.containEql('John');
            logMessage.should.containEql('john@example.com');
        });

        it('logs info message with just email when name missing', async function () {
            serviceModule.api = null;
            serviceModule.init();
            await serviceModule.api.loadTemplate();

            await serviceModule.api.send({
                member: {email: 'john@example.com'}
            });

            sinon.assert.calledOnce(loggingStub.info);
            const logMessage = loggingStub.info.getCall(0).args[0];
            logMessage.should.containEql('john@example.com');
        });

        it('uses default site title when settings cache returns null', async function () {
            settingsCacheStub.get.withArgs('title').returns(null);

            serviceModule.api = null;
            serviceModule.init();
            await serviceModule.api.loadTemplate();

            await serviceModule.api.send({
                member: {name: 'John', email: 'john@example.com'}
            });

            const renderCall = rendererRenderStub.getCall(0);
            renderCall.args[0].siteSettings.title.should.equal('Ghost');
        });

        it('uses default accent color when settings cache returns null', async function () {
            settingsCacheStub.get.withArgs('accent_color').returns(null);

            serviceModule.api = null;
            serviceModule.init();
            await serviceModule.api.loadTemplate();

            await serviceModule.api.send({
                member: {name: 'John', email: 'john@example.com'}
            });

            const renderCall = rendererRenderStub.getCall(0);
            renderCall.args[0].siteSettings.accentColor.should.equal('#15212A');
        });
    });
});
