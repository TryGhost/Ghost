/*globals describe, beforeEach, afterEach, it*/
var should          = require('should'),
    sinon           = require('sinon'),
    when            = require('when'),
    _               = require("lodash"),
    cp              = require('child_process'),
    rewire          = require("rewire"),
    testUtils       = require('../utils'),

    // Stuff we are testing
    mailer          = rewire('../../server/mail'),
    defaultConfig   = require('../../../config'),
    SMTP,
    SENDMAIL,
    fakeConfig,
    fakeSettings,
    fakeSendmail,
    sandbox = sinon.sandbox.create(),
    config;

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
};

// Mock Sendmail config
SENDMAIL = {
    transport: 'sendmail',
    options: {
        path: '/nowhere/sendmail'
    }
};

describe("Mail", function () {
    var overrideConfig = function (newConfig) {
        mailer.__set__('config',  sandbox.stub().returns(
            _.extend({}, defaultConfig, newConfig)
        ));
    };

    beforeEach(function () {
        // Mock config and settings
        fakeConfig = _.extend({}, defaultConfig);
        fakeSettings = {
            url: 'http://test.tryghost.org',
            email: 'ghost-test@localhost'
        };
        fakeSendmail = '/fake/bin/sendmail';

        config = sinon.stub().returns(fakeConfig);

        sandbox.stub(mailer, "isWindows", function () {
            return false;
        });

        sandbox.stub(mailer, "detectSendmail", function () {
            return when.resolve(fakeSendmail);
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should attach mail provider to ghost instance', function () {
        should.exist(mailer);
        mailer.should.have.property('init');
        mailer.should.have.property('transport');
        mailer.should.have.property('send').and.be.a.function;
    });

    it('should setup SMTP transport on initialization', function (done) {
        overrideConfig({mail: SMTP});
        mailer.init().then(function () {
            mailer.should.have.property('transport');
            mailer.transport.transportType.should.eql('SMTP');
            mailer.transport.sendMail.should.be.a.function;
            done();
        }).then(null, done);
    });

    it('should setup sendmail transport on initialization', function (done) {
        overrideConfig({mail: SENDMAIL});
        mailer.init().then(function () {
            mailer.should.have.property('transport');
            mailer.transport.transportType.should.eql('SENDMAIL');
            mailer.transport.sendMail.should.be.a.function;
            done();
        }).then(null, done);
    });

    it('should fallback to sendmail if no config set', function (done) {
        overrideConfig({mail: null});
        mailer.init().then(function () {
            mailer.should.have.property('transport');
            mailer.transport.transportType.should.eql('SENDMAIL');
            mailer.transport.options.path.should.eql(fakeSendmail);
            done();
        }).then(null, done);
    });

    it('should fallback to sendmail if config is empty', function (done) {
        overrideConfig({mail: {}});
        mailer.init().then(function () {
            mailer.should.have.property('transport');
            mailer.transport.transportType.should.eql('SENDMAIL');
            mailer.transport.options.path.should.eql(fakeSendmail);
            done();
        }).then(null, done);
    });

    it('should disable transport if config is empty & sendmail not found', function (done) {
        overrideConfig({mail: {}});
        mailer.detectSendmail.restore();
        sandbox.stub(mailer, "detectSendmail", when.reject);
        mailer.init().then(function () {
            should.not.exist(mailer.transport);
            done();
        }).then(null, done);
    });

    it('should disable transport if config is empty & platform is win32', function (done) {
        overrideConfig({mail: {}});
        mailer.detectSendmail.restore();
        mailer.isWindows.restore();
        sandbox.stub(mailer, 'isWindows', function () {
            return true;
        });
        mailer.init().then(function () {
            should.not.exist(mailer.transport);
            done();
        }).then(null, done);
    });

    it('should fail to send messages when no transport is set', function (done) {
        mailer.detectSendmail.restore();
        sandbox.stub(mailer, "detectSendmail", when.reject);
        mailer.init().then(function () {
            mailer.send().then(function () {
                should.fail();
                done();
            }, function (err) {
                err.should.be.an.instanceOf(Error);
                done();
            });
        });
    });

    it('should fail to send messages when given insufficient data', function (done) {
        when.settle([
            mailer.send(),
            mailer.send({}),
            mailer.send({ subject: '123' }),
            mailer.send({ subject: '', html: '123' })
        ]).then(function (descriptors) {
            descriptors.forEach(function (d) {
                d.state.should.equal('rejected');
                d.reason.should.be.an.instanceOf(Error);
            });
            done();
        });
    });

    it('should use from address as configured in config.js', function (done) {
        overrideConfig({mail:{fromaddress: 'static@example.com'}});
        mailer.fromAddress().should.equal('static@example.com');
        done();
    });

    it('should fall back to ghost@[blog.url] as from address', function (done) {
        // Standard domain
        overrideConfig({url: 'http://default.com', mail:{fromaddress: null}});
        mailer.fromAddress().should.equal('ghost@default.com');

        // Trailing slash
        overrideConfig({url: 'http://default.com/', mail:{}});
        mailer.fromAddress().should.equal('ghost@default.com');

        // Strip Port
        overrideConfig({url: 'http://default.com:2368/', mail:{}});
        mailer.fromAddress().should.equal('ghost@default.com');

        done();
    });
});
