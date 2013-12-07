/*globals describe, beforeEach, afterEach, it*/
var testUtils = require('../utils'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),

    _ = require("underscore"),
    cp = require('child_process'),

    // Stuff we are testing
    defaultConfig = require('../../../config'),
    mailer = require('../../server/mail'),
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
        fakeConfig[process.env.NODE_ENV].mail = SMTP;
        mailer.init().then(function () {
            mailer.should.have.property('transport');
            mailer.transport.transportType.should.eql('SMTP');
            mailer.transport.sendMail.should.be.a.function;
            done();
        }).then(null, done);
    });

    it('should setup sendmail transport on initialization', function (done) {
        fakeConfig[process.env.NODE_ENV].mail = SENDMAIL;
        mailer.init().then(function () {
            mailer.should.have.property('transport');
            mailer.transport.transportType.should.eql('SENDMAIL');
            mailer.transport.sendMail.should.be.a.function;
            done();
        }).then(null, done);
    });

    it('should fallback to sendmail if no config set', function (done) {
        fakeConfig[process.env.NODE_ENV].mail = null;
        mailer.init().then(function () {
            mailer.should.have.property('transport');
            mailer.transport.transportType.should.eql('SENDMAIL');
            mailer.transport.options.path.should.eql(fakeSendmail);
            done();
        }).then(null, done);
    });

    it('should fallback to sendmail if config is empty', function (done) {
        fakeConfig[process.env.NODE_ENV].mail = {};
        mailer.init().then(function () {
            mailer.should.have.property('transport');
            mailer.transport.transportType.should.eql('SENDMAIL');
            mailer.transport.options.path.should.eql(fakeSendmail);
            done();
        }).then(null, done);
    });

    it('should disable transport if config is empty & sendmail not found', function (done) {
        fakeConfig[process.env.NODE_ENV].mail = {};
        mailer.detectSendmail.restore();
        sandbox.stub(mailer, "detectSendmail", when.reject);
        mailer.init().then(function () {
            should.not.exist(mailer.transport);
            done();
        }).then(null, done);
    });

    it('should disable transport if config is empty & platform is win32', function (done) {
        fakeConfig[process.env.NODE_ENV].mail = {};
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
});
