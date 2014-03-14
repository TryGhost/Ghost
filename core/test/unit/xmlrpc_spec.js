/*globals describe, beforeEach, afterEach, it*/
var assert          = require('assert'),
    http            = require('http'),
    nock            = require('nock'),
    settings        = require('../../server/api').settings;
    should          = require('should'),
    sinon           = require('sinon'),
    testUtils       = require('../utils'),
    when            = require('when'),
    xmlrpc          = require('../../server/xmlrpc'),
    // storing current environment
    currentEnv      = process.env.NODE_ENV;

describe('XMLRPC', function () {
    var sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        // give environment a value that will ping
        process.env.NODE_ENV = "production";
    });

    afterEach(function () {
        sandbox.restore();
        // reset the environment
        process.env.NODE_ENV = currentEnv;
    });


    it('should execute two pings', function (done) {
        var ping1 = nock('http://blogsearch.google.com').post('/ping/RPC2').reply(200),
            ping2 = nock('http://rpc.pingomatic.com').post('/').reply(200),
            testPost = testUtils.DataGenerator.Content.posts[2],
            settingsStub = sandbox.stub(settings, 'read', function () {
                return when({value: '/:slug/'});
            });

        xmlrpc.ping(testPost).then(function () {
            ping1.isDone().should.be.true;
            ping2.isDone().should.be.true;

            done();
        });
    });

});
