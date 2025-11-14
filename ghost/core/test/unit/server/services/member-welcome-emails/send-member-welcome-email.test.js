const sinon = require('sinon');
const rewire = require('rewire');
const should = require('should'); // eslint-disable-line no-unused-vars

describe('Member Welcome Emails - send-member-welcome-email', function () {
    let sendMemberWelcomeEmail;
    let loggingStub;
    let configStub;
    let renderHtmlStub;
    let renderTextStub;

    beforeEach(function () {
        sendMemberWelcomeEmail = rewire('../../../../../core/server/services/member-welcome-emails/jobs/lib/send-member-welcome-email');

        loggingStub = {info: sinon.stub()};
        configStub = {get: sinon.stub().withArgs('memberWelcomeEmailTestInbox').returns('test-inbox@example.com')};
        renderHtmlStub = sinon.stub().returns('<html></html>');
        renderTextStub = sinon.stub().returns('plain');

        sendMemberWelcomeEmail.__set__('logging', loggingStub);
        sendMemberWelcomeEmail.__set__('config', configStub);
        sendMemberWelcomeEmail.__set__('renderWelcomeHtml', renderHtmlStub);
        sendMemberWelcomeEmail.__set__('renderWelcomeText', renderTextStub);
    });

    afterEach(function () {
        sinon.restore();
    });

    it('renders templates and uses the mailer with shared config', async function () {
        const mailer = {send: sinon.stub().resolves()};
        const mailConfig = {
            mailer,
            siteSettings: {
                title: 'Ghost',
                url: 'https://example.com',
                accentColor: '#ffffff'
            }
        };

        const payload = {name: 'Jamie', email: 'jamie@example.com'};

        await sendMemberWelcomeEmail({payload, mailConfig});

        sinon.assert.calledOnce(loggingStub.info);
        sinon.assert.calledWith(renderHtmlStub, {
            memberName: 'Jamie',
            siteTitle: 'Ghost',
            siteUrl: 'https://example.com',
            accentColor: '#ffffff'
        });
        sinon.assert.calledWith(renderTextStub, {
            memberName: 'Jamie',
            siteTitle: 'Ghost',
            siteUrl: 'https://example.com',
            accentColor: '#ffffff'
        });

        sinon.assert.calledWithExactly(mailer.send, {
            to: 'test-inbox@example.com',
            subject: 'Welcome to Ghost!',
            html: '<html></html>',
            text: 'plain',
            forceTextContent: true
        });
    });
});
