/*globals describe, it, beforeEach, afterEach */

var should         = require('should'),
    sinon          = require('sinon'),
    when           = require('when'),
    path           = require('path'),
    fs             = require('fs'),
    _              = require('lodash'),
    rewire         = require("rewire"),

    // Thing we are testing
    defaultConfig  = require('../../../config.example')[process.env.NODE_ENV],
    bootstrap      = rewire('../../bootstrap'),
    config         = rewire('../../server/config');

describe('Bootstrap', function () {
    var sandbox,
        rejectMessage = bootstrap.__get__('rejectMessage'),
        overrideConfig = function (newConfig) {
            bootstrap.__set__("readConfigFile",  sandbox.stub().returns(
                _.extend({}, defaultConfig, newConfig)
            ));
        };



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
        bootstrap.__set__("configFile",  path.join(config().paths.appRoot, 'config.example.js'));

        bootstrap().then(function (config) {
            config.url.should.equal(defaultConfig.url);
            config.database.client.should.equal(defaultConfig.database.client);
            config.database.connection.should.eql(defaultConfig.database.connection);
            config.server.host.should.equal(defaultConfig.server.host);
            config.server.port.should.equal(defaultConfig.server.port);

            done();
        }).then(null, done);
    });

    it('uses the passed in config file location', function (done) {
        bootstrap(path.join(config().paths.appRoot, 'config.example.js')).then(function (config) {
            config.url.should.equal(defaultConfig.url);
            config.database.client.should.equal(defaultConfig.database.client);
            config.database.connection.should.eql(defaultConfig.database.connection);
            config.server.host.should.equal(defaultConfig.server.host);
            config.server.port.should.equal(defaultConfig.server.port);

            done();
        }).then(null, done);
    });

    it('creates the config file if one does not exist', function (done) {

        var deferred = when.defer(),
            // trick bootstrap into thinking that the config file doesn't exist yet
            existsStub  = sandbox.stub(fs, 'exists', function (file, cb) { return cb(false); }),
            // create a method which will return a pre-resolved promise
            resolvedPromise = sandbox.stub().returns(deferred.promise);

        deferred.resolve();

        // ensure that the file creation is a stub, the tests shouldn't really create a file
        bootstrap.__set__("writeConfigFile",  resolvedPromise);
        bootstrap.__set__("validateConfigEnvironment",  resolvedPromise);

        bootstrap().then(function () {
            existsStub.calledOnce.should.be.true;
            resolvedPromise.calledTwice.should.be.true;
            done();
        }).then(null, done);
    });

    it('accepts valid urls', function (done) {
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

            // Next test
            overrideConfig({url: '//testurl.com'});
            return bootstrap();
        }).then(function (localConfig) {
            localConfig.url.should.equal('//testurl.com');

            done();
        }).then(null, done);
    });

    it('rejects invalid urls', function (done) {
        // replace the config file with invalid data
        overrideConfig({url: 'notvalid'});

        bootstrap().otherwise(function (error) {
            error.should.include(rejectMessage);

            // Next test
            overrideConfig({url: 'something.com'});
            return bootstrap();
        }).otherwise(function (error) {
            error.should.include(rejectMessage);

            done();
        }).then(function () {
            should.fail('no error was thrown when it should have been');
            done();
        }).then(done, null);
    });

    it('does not permit subdirectories named ghost', function (done) {
        // replace the config file with invalid data
        overrideConfig({url: 'http://testurl.com/ghost/'});

        bootstrap().otherwise(function (error) {
            error.should.include(rejectMessage);

             // Next test
            overrideConfig({url: 'http://testurl.com/ghost/blog/'});
            return bootstrap();
        }).otherwise(function (error) {
            error.should.include(rejectMessage);

            // Next test
            overrideConfig({url: 'http://testurl.com/blog/ghost'});
            return bootstrap();
        }).otherwise(function (error) {
            error.should.include(rejectMessage);

            done();
        }).then(function () {
            should.fail('no error was thrown when it should have been');
            done();
        }).then(done, null);
    });

    it('requires a database config', function (done) {
        // replace the config file with invalid data
        overrideConfig({database: null});

        bootstrap().otherwise(function (error) {
            error.should.include(rejectMessage);

            // Next test
            overrideConfig({database: {}});
            return bootstrap();
        }).otherwise(function (error) {
            error.should.include(rejectMessage);

            done();
        }).then(function () {
            should.fail('no error was thrown when it should have been');
            done();
        }).then(done, null);
    });


    it('requires a socket or a host and port', function (done) {
        // replace the config file with invalid data
        overrideConfig({server: {socket: 'test'}});

        bootstrap().then(function (localConfig) {
            localConfig.server.socket.should.equal('test');

              // Next test
            overrideConfig({server: null});
            return bootstrap();
        }).otherwise(function (error) {
            error.should.include(rejectMessage);

            // Next test
            overrideConfig({server: {host: null}});
            return bootstrap();
        }).otherwise(function (error) {
            error.should.include(rejectMessage);

            // Next test
            overrideConfig({server: {port: null}});
            return bootstrap();
        }).otherwise(function (error) {
            error.should.include(rejectMessage);

            // Next test
            overrideConfig({server: {host: null, port: null}});
            return bootstrap();
        }).otherwise(function (error) {
            error.should.include(rejectMessage);

            done();
        }).then(function () {
            should.fail('no error was thrown when it should have been');
            done();
        }).then(done, null);
    });
});