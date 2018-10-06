var should = require('should'),
    sinon = require('sinon'),
    Promise = require('bluebird'),
    mail = require('../../../../server/services/mail'),
    settingsCache = require('../../../../server/services/settings/cache'),
    configUtils = require('../../../utils/configUtils'),
    common = require('../../../../server/lib/common'),
    sandbox = sinon.sandbox.create(),
    mailer,

    // Mock SMTP config
    SMTP = {
        transport: 'SMTP',
        options: {
            service: 'Gmail',
            auth: {
                user: 'nil',
                pass: '123'
            }
        }
    },

    // test data
    mailDataNoDomain = {
        to: 'joe@doesntexistexample091283zalgo.com',
        subject: 'testemail',
        html: '<p>This</p>'
    },
    mailDataNoServer = {
        to: 'joe@example.com',
        subject: 'testemail',
        html: '<p>This</p>'
    },
    mailDataIncomplete = {
        subject: 'testemail',
        html: '<p>This</p>'
    };

common.i18n.init();

describe('Mail: Ghostmailer', function () {
    afterEach(function () {
        mailer = null;
        configUtils.restore();
        sandbox.restore();
    });

    it('should attach mail provider to ghost instance', function () {
        mailer = new mail.GhostMailer();

        should.exist(mailer);
        mailer.should.have.property('send').and.be.a.Function();
    });

    it('should setup SMTP transport on initialization', function () {
        configUtils.set({mail: SMTP});
        mailer = new mail.GhostMailer();

        mailer.should.have.property('transport');
        mailer.transport.transportType.should.eql('SMTP');
        mailer.transport.sendMail.should.be.a.Function();
    });

    it('should fallback to direct if config is empty', function () {
        configUtils.set({mail: {}});

        mailer = new mail.GhostMailer();

        mailer.should.have.property('transport');
        mailer.transport.transportType.should.eql('DIRECT');
    });

    it('sends valid message successfully ', function (done) {
        configUtils.set({mail: {transport: 'stub'}});

        mailer = new mail.GhostMailer();

        mailer.transport.transportType.should.eql('STUB');

        mailer.send(mailDataNoServer).then(function (response) {
            should.exist(response.message);
            should.exist(response.envelope);
            response.envelope.to.should.containEql('joe@example.com');

            done();
        }).catch(done);
    });

    it('handles failure', function (done) {
        configUtils.set({mail: {transport: 'stub', options: {error: 'Stub made a boo boo :('}}});

        mailer = new mail.GhostMailer();

        mailer.transport.transportType.should.eql('STUB');

        mailer.send(mailDataNoServer).then(function () {
            done(new Error('Stub did not error'));
        }).catch(function (error) {
            error.message.should.containEql('Stub made a boo boo :(');
            done();
        }).catch(done);
    });

    it('should fail to send messages when given insufficient data', function (done) {
        mailer = new mail.GhostMailer();

        Promise.all([
            mailer.send().reflect(),
            mailer.send({}).reflect(),
            mailer.send({subject: '123'}).reflect(),
            mailer.send({subject: '', html: '123'}).reflect()
        ]).then(function (descriptors) {
            descriptors.forEach(function (d) {
                d.isFulfilled().should.be.false();
                d.reason().should.be.an.instanceOf(Error);
                d.reason().message.should.eql('Incomplete message data.');
            });
            done();
        }).catch(done);
    });

    describe('Direct', function () {
        beforeEach(function () {
            configUtils.set({mail: {}});

            mailer = new mail.GhostMailer();
        });

        afterEach(function () {
            mailer = null;
        });

        it('return correct failure message for domain doesn\'t exist', function (done) {
            mailer.transport.transportType.should.eql('DIRECT');

            mailer.send(mailDataNoDomain).then(function () {
                done(new Error('Error message not shown.'));
            }, function (error) {
                error.message.should.startWith('Failed to send email.');
                done();
            }).catch(done);
        });

        it('return correct failure message for no mail server at this address', function (done) {
            mailer.transport.transportType.should.eql('DIRECT');

            mailer.send(mailDataNoServer).then(function () {
                done(new Error('Error message not shown.'));
            }, function (error) {
                error.message.should.eql('Failed to send email.');
                done();
            }).catch(done);
        });

        it('return correct failure message for incomplete data', function (done) {
            mailer.transport.transportType.should.eql('DIRECT');

            mailer.send(mailDataIncomplete).then(function () {
                done(new Error('Error message not shown.'));
            }, function (error) {
                error.message.should.eql('Incomplete message data.');
                done();
            }).catch(done);
        });
    });

    describe('From address', function () {
        it('should use the config', function () {
            configUtils.set({
                mail: {
                    from: '"Blog Title" <static@example.com>'
                }
            });

            mailer = new mail.GhostMailer();

            mailer.from().should.equal('"Blog Title" <static@example.com>');
        });

        it('should fall back to [blog.title] <ghost@[blog.url]>', function () {
            sandbox.stub(settingsCache, 'get').returns('Test');

            // Standard domain
            configUtils.set({url: 'http://default.com', mail: {from: null}});

            mailer = new mail.GhostMailer();

            mailer.from().should.equal('"Test" <ghost@default.com>');

            // Trailing slash
            configUtils.set({url: 'http://default.com/', mail: {from: null}});

            mailer.from().should.equal('"Test" <ghost@default.com>');

            // Strip Port
            configUtils.set({url: 'http://default.com:2368/', mail: {from: null}});
            mailer.from().should.equal('"Test" <ghost@default.com>');

            settingsCache.get.restore();
            sandbox.stub(settingsCache, 'get').returns('Test"');

            // Escape title
            configUtils.set({url: 'http://default.com:2368/', mail: {from: null}});
            mailer.from().should.equal('"Test\\"" <ghost@default.com>');
        });

        it('should use mail.from', function () {
            // Standard domain
            configUtils.set({mail: {from: '"bar" <from@default.com>'}});

            mailer = new mail.GhostMailer();

            mailer.from().should.equal('"bar" <from@default.com>');
        });

        it('should attach blog title', function () {
            sandbox.stub(settingsCache, 'get').returns('Test');

            configUtils.set({mail: {from: 'from@default.com'}});

            mailer = new mail.GhostMailer();

            mailer.from().should.equal('"Test" <from@default.com>');

            // only from set
            configUtils.set({mail: {from: 'from@default.com'}});
            mailer.from().should.equal('"Test" <from@default.com>');
        });

        it('should ignore theme title if from address is Title <email@address.com> format', function () {
            configUtils.set({mail: {from: '"R2D2" <from@default.com>'}});

            mailer = new mail.GhostMailer();

            mailer.from().should.equal('"R2D2" <from@default.com>');

            // only from set
            configUtils.set({mail: {from: '"R2D2" <from@default.com>'}});
            mailer.from().should.equal('"R2D2" <from@default.com>');
        });

        it('should use default title if not theme title is provided', function () {
            configUtils.set({url: 'http://default.com:2368/', mail: {from: null}});

            mailer = new mail.GhostMailer();

            mailer.from().should.equal('"Ghost at default.com" <ghost@default.com>');
        });
    });
});
