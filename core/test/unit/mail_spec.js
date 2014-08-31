/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var should          = require('should'),
    sinon           = require('sinon'),
    Promise         = require('bluebird'),
    _               = require('lodash'),
    rewire          = require('rewire'),

    // Stuff we are testing
    mailer          = rewire('../../server/mail'),
    defaultConfig   = require('../../../config'),
    SMTP,
    fakeConfig,
    fakeSettings,
    sandbox = sinon.sandbox.create();

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


describe('Mail', function () {
    var overrideConfig = function (newConfig) {
        var config = rewire('../../server/config'),
            existingConfig = mailer.__get__('config');

        config.set(_.extend(existingConfig, newConfig));
    };

    beforeEach(function () {
        // Mock config and settings
        fakeConfig = _.extend({}, defaultConfig);
        fakeSettings = {
            url: 'http://test.tryghost.org',
            email: 'ghost-test@localhost'
        };


        overrideConfig(fakeConfig);
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
        }).catch(done);
    });

    it('should fallback to direct if config is empty', function (done) {
        overrideConfig({mail: {}});
        mailer.init().then(function () {
            mailer.should.have.property('transport');
            mailer.transport.transportType.should.eql('DIRECT');

            done();
        }).catch(done);
    });

    it('should fail to send messages when given insufficient data', function (done) {
        Promise.settle([
            mailer.send(),
            mailer.send({}),
            mailer.send({ subject: '123' }),
            mailer.send({ subject: '', html: '123' })
        ]).then(function (descriptors) {
            descriptors.forEach(function (d) {
                d.isRejected().should.be.true;
                d.reason().should.be.an.instanceOf(Error);
            });
            done();
        }).catch(done);
    });

    it('should use from address as configured in config.js', function () {
        overrideConfig({mail: {fromaddress: 'static@example.com'}});
        mailer.fromAddress().should.equal('static@example.com');
    });

    it('should fall back to ghost@[blog.url] as from address', function () {
        // Standard domain
        overrideConfig({url: 'http://default.com', mail: {fromaddress: null}});
        mailer.fromAddress().should.equal('ghost@default.com');

        // Trailing slash
        overrideConfig({url: 'http://default.com/', mail: {}});
        mailer.fromAddress().should.equal('ghost@default.com');

        // Strip Port
        overrideConfig({url: 'http://default.com:2368/', mail: {}});
        mailer.fromAddress().should.equal('ghost@default.com');
    });
});
