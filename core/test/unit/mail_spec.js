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

    it('should fallback to direct if no config set', function (done) {
        fakeConfig[process.env.NODE_ENV].mail = null;
        mailer.init().then(function () {
            mailer.should.have.property('transport');
            mailer.transport.transportType.should.eql('DIRECT');
            done();
        }).then(null, done);
    });

    it('should fallback to direct if config is empty', function (done) {
        fakeConfig[process.env.NODE_ENV].mail = {};
        mailer.init().then(function () {
            mailer.should.have.property('transport');
            mailer.transport.transportType.should.eql('DIRECT');
            done();
        }).then(null, done);
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
