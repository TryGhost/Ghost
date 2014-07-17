/*globals describe, it, beforeEach, afterEach */
/*jshint expr:true*/
var should         = require('should'),
    sinon          = require('sinon'),
    when           = require('when'),
    path           = require('path'),
    fs             = require('fs'),
    _              = require('lodash'),
    rewire         = require('rewire'),

    // Thing we are testing
    defaultConfig  = require('../../../config.example')[process.env.NODE_ENV],
    bootstrap      = rewire('../../bootstrap'),
    config         = rewire('../../server/config');

describe('Bootstrap', function () {
    var sandbox,
        overrideConfig = function (newConfig) {
            bootstrap.__set__('readConfigFile',  sandbox.stub().returns(
                _.extend({}, defaultConfig, newConfig)
            ));
        },
        expectedError = new Error('expected bootstrap() to throw error but none thrown');

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
    });

    afterEach(function () {
        bootstrap         = rewire('../../bootstrap');
        sandbox.restore();
    });

    it('loads the config file if one exists', function (done) {
        // the test infrastructure is setup so that there is always config present,
        // but we want to overwrite the test to actually load config.example.js, so that any local changes
        // don't break the tests
        bootstrap.__set__('configFile',  path.join(config.paths.appRoot, 'config.example.js'));

        bootstrap().then(function (config) {
            config.url.should.equal(defaultConfig.url);
            config.database.client.should.equal(defaultConfig.database.client);
            config.database.connection.should.eql(defaultConfig.database.connection);
            config.server.host.should.equal(defaultConfig.server.host);
            config.server.port.should.equal(defaultConfig.server.port);

            done();
        }).catch(done);
    });

    it('uses the passed in config file location', function (done) {
        bootstrap(path.join(config.paths.appRoot, 'config.example.js')).then(function (config) {
            config.url.should.equal(defaultConfig.url);
            config.database.client.should.equal(defaultConfig.database.client);
            config.database.connection.should.eql(defaultConfig.database.connection);
            config.server.host.should.equal(defaultConfig.server.host);
            config.server.port.should.equal(defaultConfig.server.port);

            done();
        }).catch(done);
    });

    it('creates the config file if one does not exist', function (done) {

        var deferred = when.defer(),
            // trick bootstrap into thinking that the config file doesn't exist yet
            existsStub  = sandbox.stub(fs, 'exists', function (file, cb) { return cb(false); }),
            // create a method which will return a pre-resolved promise
            resolvedPromise = sandbox.stub().returns(deferred.promise);

        deferred.resolve();

        // ensure that the file creation is a stub, the tests shouldn't really create a file
        bootstrap.__set__('writeConfigFile',  resolvedPromise);
        bootstrap.__set__('validateConfigEnvironment',  resolvedPromise);

        bootstrap().then(function () {
            existsStub.calledOnce.should.be.true;
            resolvedPromise.calledTwice.should.be.true;
            done();
        }).catch(done);
    });

    it('accepts urls with a valid scheme', function (done) {
        // replace the config file with invalid data
        overrideConfig({url: 'http://testurl.com'});

        bootstrap().then(function (localConfig) {
            localConfig.url.should.equal('http://testurl.com');

            // Next test
            overrideConfig({url: 'https://testurl.com'});
            return bootstrap();
        }).then(function (localConfig) {
            localConfig.url.should.equal('https://testurl.com');

             // Next test
            overrideConfig({url: 'http://testurl.com/blog/'});
            return bootstrap();
        }).then(function (localConfig) {
            localConfig.url.should.equal('http://testurl.com/blog/');

             // Next test
            overrideConfig({url: 'http://testurl.com/ghostly/'});
            return bootstrap();
        }).then(function (localConfig) {
            localConfig.url.should.equal('http://testurl.com/ghostly/');

            done();
        }).catch(done);
    });

    it('rejects a fqdn without a scheme', function (done) {

        overrideConfig({ url: 'example.com' });

        bootstrap().then(function () {
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });

    it('rejects a hostname without a scheme', function (done) {

        overrideConfig({ url: 'example' });

        bootstrap().then(function () {
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });

    it('rejects a hostname with a scheme', function (done) {

        overrideConfig({ url: 'https://example' });

        bootstrap().then(function () {
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });

    it('rejects a url with an unsupported scheme', function (done) {

        overrideConfig({ url: 'ftp://example.com' });

        bootstrap().then(function () {
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });

     it('rejects a url with a protocol relative scheme', function (done) {

        overrideConfig({ url: '//example.com' });

        bootstrap().then(function () {
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });

    it('does not permit the word ghost as a url path', function (done) {
        overrideConfig({ url: 'http://example.com/ghost/' });

        bootstrap().then(function () {
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });

    it('does not permit the word ghost to be a component in a url path', function (done) {
        overrideConfig({ url: 'http://example.com/blog/ghost/' });

        bootstrap().then(function () {
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });

    it('does not permit the word ghost to be a component in a url path', function (done) {
        overrideConfig({ url: 'http://example.com/ghost/blog/' });

        bootstrap().then(function () {
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });

    it('does not permit database config to be falsy', function (done) {
        // replace the config file with invalid data
        overrideConfig({ database: false });

        bootstrap().then(function () {
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });

    it('does not permit database config to be empty', function (done) {
        // replace the config file with invalid data
        overrideConfig({ database: {} });

        bootstrap().then(function () {
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });


    it('requires server to be present', function (done) {
        overrideConfig({ server: false });

        bootstrap().then(function (localConfig) {
            /*jshint unused:false*/
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });

    it('allows server to use a socket', function (done) {
        overrideConfig({ server: { socket: 'test' } });

        bootstrap().then(function (localConfig) {
            should.exist(localConfig);
            localConfig.server.socket.should.equal('test');

            done();
        }).catch(done);
    });

    it('allows server to have a host and a port', function (done) {
        overrideConfig({ server: { host: '127.0.0.1', port: '2368' } });

        bootstrap().then(function (localConfig) {
            should.exist(localConfig);
            localConfig.server.host.should.equal('127.0.0.1');
            localConfig.server.port.should.equal('2368');

            done();
        }).catch(done);
    });

    it('rejects server if there is a host but no port', function (done) {
        overrideConfig({ server: { host: '127.0.0.1' } });

        bootstrap().then(function () {
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });

    it('rejects server if there is a port but no host', function (done) {
        overrideConfig({ server: { port: '2368' } });

        bootstrap().then(function () {
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });

    it('rejects server if configuration is empty', function (done) {
        overrideConfig({ server: {} });

        bootstrap().then(function () {
            done(expectedError);
        }).catch(function (err) {
            should.exist(err);
            err.should.be.an.Error;

            done();
        }).catch(done);
    });
});