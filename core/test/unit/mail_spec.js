/*globals describe, beforeEach, afterEach, it*/
var testUtils = require('./testUtils'),
    should = require('should'),
    sinon = require('sinon'),
    when = require('when'),

    _ = require("underscore"),
    cp = require('child_process'),

    // Stuff we are testing
    Ghost = require('../../ghost'),
    defaultConfig = require('../../../config'),
    SMTP,
    SENDMAIL,
    fakeConfig,
    fakeSettings,
    fakeSendmail,
    sandbox = sinon.sandbox.create(),
    ghost;

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

        ghost = new Ghost();

        sandbox.stub(ghost, "config", function () {
            return fakeConfig;
        });

        sandbox.stub(ghost, "settings", function () {
            return fakeSettings;
        });

        sandbox.stub(ghost.mail, "isWindows", function () {
            return false;
        });

        sandbox.stub(ghost.mail, "detectSendmail", function () {
            return when.resolve(fakeSendmail);
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('should attach mail provider to ghost instance', function () {
        should.exist(ghost.mail);
        ghost.mail.should.have.property('init');
        ghost.mail.should.have.property('transport');
        ghost.mail.should.have.property('send').and.be.a('function');
    });

    it('should setup SMTP transport on initialization', function (done) {
        fakeConfig.mail = SMTP;
        ghost.mail.init(ghost).then(function(){
            ghost.mail.should.have.property('transport');
            ghost.mail.transport.transportType.should.eql('SMTP');
            ghost.mail.transport.sendMail.should.be.a('function');
            done();
        }).then(null, done);
    });

    it('should setup sendmail transport on initialization', function (done) {
        fakeConfig.mail = SENDMAIL;
        ghost.mail.init(ghost).then(function(){
            ghost.mail.should.have.property('transport');
            ghost.mail.transport.transportType.should.eql('SENDMAIL');
            ghost.mail.transport.sendMail.should.be.a('function');
            done();
        }).then(null, done);
    });

    it('should fallback to sendmail if no config set', function (done) {
        fakeConfig.mail = null;
        ghost.mail.init(ghost).then(function(){
            ghost.mail.should.have.property('transport');
            ghost.mail.transport.transportType.should.eql('SENDMAIL');
            ghost.mail.transport.options.path.should.eql(fakeSendmail);
            done();
        }).then(null, done);
    });

    it('should fallback to sendmail if config is empty', function (done) {
        fakeConfig.mail = {};
        ghost.mail.init(ghost).then(function(){
            ghost.mail.should.have.property('transport');
            ghost.mail.transport.transportType.should.eql('SENDMAIL');
            ghost.mail.transport.options.path.should.eql(fakeSendmail);
            done();
        }).then(null, done);
    });

    it('should disable transport if config is empty & sendmail not found', function (done) {
        fakeConfig.mail = {};
        ghost.mail.detectSendmail.restore();
        sandbox.stub(ghost.mail, "detectSendmail", when.reject);
        ghost.mail.init(ghost).then(function(){
            should.not.exist(ghost.mail.transport);
            done();
        }).then(null, done);
    });

    it('should disable transport if config is empty & platform is win32', function (done) {
        fakeConfig.mail = {};
        ghost.mail.detectSendmail.restore();
        ghost.mail.isWindows.restore();
        sandbox.stub(ghost.mail, 'isWindows', function(){ return true });
        ghost.mail.init(ghost).then(function(){
            should.not.exist(ghost.mail.transport);
            done();
        }).then(null, done);
    });

    it('should fail to send messages when no transport is set', function (done) {
        ghost.mail.detectSendmail.restore();
        sandbox.stub(ghost.mail, "detectSendmail", when.reject);
        ghost.mail.init(ghost).then(function(){
            ghost.mail.send().then(function(){
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
            ghost.mail.send(),
            ghost.mail.send({}),
            ghost.mail.send({ subject: '123' }),
            ghost.mail.send({ subject: '', html: '123' })
        ]).then(function (descriptors) {
            descriptors.forEach(function (d) {
                d.state.should.equal('rejected');
                d.reason.should.be.an.instanceOf(Error);
            });
            done();
        });
    });

});
