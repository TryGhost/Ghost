const dns = require('dns');
const should = require('should');
const sinon = require('sinon');
const mail = require('../../../../../core/server/services/mail');
const settingsCache = require('../../../../../core/shared/settings-cache');
const configUtils = require('../../../../utils/config-utils');
const urlUtils = require('../../../../../core/shared/url-utils');
let mailer;
const assert = require('node:assert/strict');
const {assertExists} = require('../../../../utils/assertions');
const emailAddress = require('../../../../../core/server/services/email-address');

// Mock SMTP config
const SMTP = {
    transport: 'SMTP',
    options: {
        service: 'Gmail',
        auth: {
            user: 'nil',
            pass: '123'
        }
    }
};

// test data
const mailDataNoDomain = {
    to: 'joe@doesntexistexample091283zalgo.com',
    subject: 'testemail',
    html: '<p>This</p>'
};

const mailDataNoServer = {
    to: 'joe@example.com',
    subject: 'testemail',
    html: '<p>This</p>'
};

const mailDataIncomplete = {
    subject: 'testemail',
    html: '<p>This</p>'
};

const sandbox = sinon.createSandbox();

describe('Mail: Ghostmailer', function () {
    before(function () {
        emailAddress.init();
        sinon.restore();
    });

    afterEach(async function () {
        mailer = null;
        await configUtils.restore();
        sandbox.restore();
    });

    it('should attach mail provider to ghost instance', function () {
        mailer = new mail.GhostMailer();

        assertExists(mailer);
        mailer.should.have.property('send').and.be.a.Function();
    });

    it('should setup SMTP transport on initialization', function () {
        configUtils.set({mail: SMTP});
        mailer = new mail.GhostMailer();

        assert('transport' in mailer);
        assert.equal(mailer.transport.transporter.name, 'SMTP');
        mailer.transport.sendMail.should.be.a.Function();
    });

    it('should fallback to direct if config is empty', function () {
        configUtils.set({mail: {}});

        mailer = new mail.GhostMailer();

        assert('transport' in mailer);
        assert.equal(mailer.transport.transporter.name, 'SMTP (direct)');
    });

    it('sends valid message successfully ', function (done) {
        configUtils.set({mail: {transport: 'stub'}});

        mailer = new mail.GhostMailer();

        assert.equal(mailer.transport.transporter.name, 'Stub');

        mailer.send(mailDataNoServer).then(function (response) {
            assertExists(response.response);
            assertExists(response.envelope);
            assert(response.envelope.to.includes('joe@example.com'));

            done();
        }).catch(done);
    });

    it('handles failure', function (done) {
        configUtils.set({mail: {transport: 'stub', options: {error: 'Stub made a boo boo :('}}});

        mailer = new mail.GhostMailer();

        assert.equal(mailer.transport.transporter.name, 'Stub');

        mailer.send(mailDataNoServer).then(function () {
            done(new Error('Stub did not error'));
        }).catch(function (error) {
            assert(error.message.includes('Stub made a boo boo :('));
            done();
        }).catch(done);
    });

    it('should fail to send messages when given insufficient data', async function () {
        mailer = new mail.GhostMailer();

        await assert.rejects(mailer.send(), {message: 'Incomplete message data.'});
        await assert.rejects(mailer.send({subject: '123'}), {message: 'Incomplete message data.'});
        await assert.rejects(mailer.send({subject: '', html: '123'}), {message: 'Incomplete message data.'});
    });

    describe('Direct', function () {
        beforeEach(function () {
            configUtils.set({mail: {}});

            mailer = new mail.GhostMailer();

            sinon.stub(dns, 'resolveMx').yields(null, []);
        });

        afterEach(function () {
            mailer = null;
            sinon.restore();
        });

        it('return correct failure message for domain doesn\'t exist', async function () {
            assert.equal(mailer.transport.transporter.name, 'SMTP (direct)');
            await assert.rejects(mailer.send(mailDataNoDomain), /Failed to send email/);
        });

        it('return correct failure message for no mail server at this address', async function () {
            assert.equal(mailer.transport.transporter.name, 'SMTP (direct)');
            await assert.rejects(mailer.send(mailDataNoServer), /Failed to send email/);
        });

        it('return correct failure message for incomplete data', async function () {
            assert.equal(mailer.transport.transporter.name, 'SMTP (direct)');
            await assert.rejects(mailer.send(mailDataIncomplete), /Incomplete message data/);
        });
    });

    describe('From address', function () {
        it('should use the config', async function () {
            configUtils.set({
                mail: {
                    from: '"Blog Title" <static@example.com>'
                }
            });

            mailer = new mail.GhostMailer();

            const sendMailSpy = sandbox.stub(mailer, 'sendMail').resolves();
            mailer.transport.transporter.name = 'NOT DIRECT';

            await mailer.send({
                to: 'user@example.com',
                subject: 'subject',
                html: 'content'
            });

            assert.equal(sendMailSpy.firstCall.args[0].from, '"Blog Title" <static@example.com>');
        });

        describe('should fall back to [blog.title] <noreply@[blog.url]>', function () {
            beforeEach(async function () {
                mailer = new mail.GhostMailer();
                sandbox.stub(mailer, 'sendMail').resolves();
                mailer.transport.transporter.name = 'NOT DIRECT';
                sandbox.stub(settingsCache, 'get').returns('Test');
            });

            it('standard domain', async function () {
                sandbox.stub(urlUtils, 'urlFor').returns('http://default.com');
                configUtils.set({mail: {from: null}});

                await mailer.send({
                    to: 'user@example.com',
                    subject: 'subject',
                    html: 'content'
                });

                assert.equal(mailer.sendMail.firstCall.args[0].from, '"Test" <noreply@default.com>');
            });

            it('trailing slash', async function () {
                sandbox.stub(urlUtils, 'urlFor').returns('http://default.com/');
                configUtils.set({mail: {from: null}});

                await mailer.send({
                    to: 'user@example.com',
                    subject: 'subject',
                    html: 'content'
                });

                assert.equal(mailer.sendMail.firstCall.args[0].from, '"Test" <noreply@default.com>');
            });

            it('strip port', async function () {
                sandbox.stub(urlUtils, 'urlFor').returns('http://default.com:2368/');
                configUtils.set({mail: {from: null}});

                await mailer.send({
                    to: 'user@example.com',
                    subject: 'subject',
                    html: 'content'
                });

                assert.equal(mailer.sendMail.firstCall.args[0].from, '"Test" <noreply@default.com>');
            });

            it('Escape title', async function () {
                settingsCache.get.restore();
                sandbox.stub(settingsCache, 'get').returns('Test"');

                sandbox.stub(urlUtils, 'urlFor').returns('http://default.com:2368/');
                configUtils.set({mail: {from: null}});

                await mailer.send({
                    to: 'user@example.com',
                    subject: 'subject',
                    html: 'content'
                });

                assert.equal(mailer.sendMail.firstCall.args[0].from, '"Test\\"" <noreply@default.com>');
            });
        });

        it('should use mail.from', async function () {
            // Standard domain
            configUtils.set({mail: {from: '"bar" <from@default.com>'}});

            mailer = new mail.GhostMailer();

            const sendMailSpy = sandbox.stub(mailer, 'sendMail').resolves();
            mailer.transport.transporter.name = 'NOT DIRECT';

            await mailer.send({
                to: 'user@example.com',
                subject: 'subject',
                html: 'content'
            });

            assert.equal(sendMailSpy.firstCall.args[0].from, '"bar" <from@default.com>');
        });

        it('should attach blog title', async function () {
            sandbox.stub(settingsCache, 'get').returns('Test');

            configUtils.set({mail: {from: 'from@default.com'}});

            mailer = new mail.GhostMailer();

            const sendMailSpy = sandbox.stub(mailer, 'sendMail').resolves();
            mailer.transport.transporter.name = 'NOT DIRECT';

            await mailer.send({
                to: 'user@example.com',
                subject: 'subject',
                html: 'content'
            });

            assert.equal(sendMailSpy.firstCall.args[0].from, '"Test" <from@default.com>');

            // only from set
            configUtils.set({mail: {from: 'from@default.com'}});

            await mailer.send({
                to: 'user@example.com',
                subject: 'subject',
                html: 'content'
            });

            assert.equal(sendMailSpy.firstCall.args[0].from, '"Test" <from@default.com>');
        });

        it('should ignore theme title if from address is Title <email@address.com> format', async function () {
            configUtils.set({mail: {from: '"R2D2" <from@default.com>'}});

            mailer = new mail.GhostMailer();

            const sendMailSpy = sandbox.stub(mailer, 'sendMail').resolves();
            mailer.transport.transporter.name = 'NOT DIRECT';

            await mailer.send({
                to: 'user@example.com',
                subject: 'subject',
                html: 'content'
            });

            assert.equal(sendMailSpy.firstCall.args[0].from, '"R2D2" <from@default.com>');

            // only from set
            configUtils.set({mail: {from: '"R2D2" <from@default.com>'}});
            await mailer.send({
                to: 'user@example.com',
                subject: 'subject',
                html: 'content'
            });

            assert.equal(sendMailSpy.firstCall.args[0].from, '"R2D2" <from@default.com>');
        });

        it('should use default title if not theme title is provided', async function () {
            configUtils.set({mail: {from: null}});
            sandbox.stub(urlUtils, 'urlFor').returns('http://default.com:2368/');

            mailer = new mail.GhostMailer();

            const sendMailSpy = sandbox.stub(mailer, 'sendMail').resolves();
            mailer.transport.transporter.name = 'NOT DIRECT';

            await mailer.send({
                to: 'user@example.com',
                subject: 'subject',
                html: 'content'
            });

            assert.equal(sendMailSpy.firstCall.args[0].from, '"Ghost at default.com" <noreply@default.com>');
        });
    });

    describe('Mailgun tagging', function () {
        beforeEach(function () {
            configUtils.set({mail: {transport: 'stub'}});
        });

        it('should add site-based tag when using Mailgun, site ID exists, and email tracking is enabled', async function () {
            configUtils.set({
                hostSettings: {siteId: '123123'}
            });
            sandbox.stub(settingsCache, 'get').withArgs('email_track_opens').returns(true);

            mailer = new mail.GhostMailer();
            // Mock the state to simulate Mailgun transport
            mailer.state.usingMailgun = true;
            const sendMailSpy = sandbox.stub(mailer.transport, 'sendMail').resolves({});

            await mailer.send({
                to: 'user@example.com',
                subject: 'test',
                html: 'content'
            });

            const sentMessage = sendMailSpy.firstCall.args[0];
            sentMessage['o:tag'].should.be.an.Array();
            assert(sentMessage['o:tag'].includes('transactional-email'));
            assert(sentMessage['o:tag'].includes('blog-123123'));
            assert.equal(sentMessage['o:tracking-opens'], true);
        });

        it('should add tags but not enable open tracking when email tracking is disabled', async function () {
            configUtils.set({
                hostSettings: {siteId: '123123'}
            });
            sandbox.stub(settingsCache, 'get').withArgs('email_track_opens').returns(false);

            mailer = new mail.GhostMailer();
            mailer.state.usingMailgun = true;
            const sendMailSpy = sandbox.stub(mailer.transport, 'sendMail').resolves({});

            await mailer.send({
                to: 'user@example.com',
                subject: 'test',
                html: 'content'
            });

            const sentMessage = sendMailSpy.firstCall.args[0];
            sentMessage['o:tag'].should.be.an.Array();
            assert(sentMessage['o:tag'].includes('transactional-email'));
            assert(sentMessage['o:tag'].includes('blog-123123'));
            assert.equal(sentMessage['o:tracking-opens'], undefined);
        });

        it('should not add site ID tag when site ID is missing', async function () {
            configUtils.set({
                hostSettings: {} // No siteId
            });
            sandbox.stub(settingsCache, 'get').withArgs('email_track_opens').returns(true);

            mailer = new mail.GhostMailer();
            mailer.state.usingMailgun = true;
            const sendMailSpy = sandbox.stub(mailer.transport, 'sendMail').resolves({});

            await mailer.send({
                to: 'user@example.com',
                subject: 'test',
                html: 'content'
            });

            const sentMessage = sendMailSpy.firstCall.args[0];
            assert(sentMessage['o:tag'].includes('transactional-email'));
            assert(!sentMessage['o:tag'].includes('blog-123123'));
        });

        it('should not add tag when not using Mailgun transport', async function () {
            configUtils.set({
                hostSettings: {siteId: '999999'}
            });

            mailer = new mail.GhostMailer();
            // usingMailgun defaults to false when using stub transport
            const sendMailSpy = sandbox.stub(mailer.transport, 'sendMail').resolves({});

            await mailer.send({
                to: 'user@example.com',
                subject: 'test',
                html: 'content'
            });

            const sentMessage = sendMailSpy.firstCall.args[0];
            assert.equal(sentMessage['o:tag'], undefined);
        });
    });
});
