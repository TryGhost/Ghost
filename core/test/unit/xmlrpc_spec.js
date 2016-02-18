/*globals describe, beforeEach, afterEach, it*/
var nock            = require('nock'),
    should          = require('should'),
    sinon           = require('sinon'),
    testUtils       = require('../utils'),
    xmlrpc          = require('../../server/data/xml/xmlrpc'),
    events          = require('../../server/events'),
    // storing current environment
    currentEnv      = process.env.NODE_ENV;

// To stop jshint complaining
should.equal(true, true);

describe('XMLRPC', function () {
    var sandbox;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        // give environment a value that will ping
        process.env.NODE_ENV = 'production';
    });

    afterEach(function () {
        sandbox.restore();
        // reset the environment
        process.env.NODE_ENV = currentEnv;
    });

    it('should execute two pings', function () {
        var ping1 = nock('http://blogsearch.google.com').post('/ping/RPC2').reply(200),
            ping2 = nock('http://rpc.pingomatic.com').post('/').reply(200),
            testPost = {
                toJSON: function () {
                    return testUtils.DataGenerator.Content.posts[2];
                }
            };

        xmlrpc.init();
        events.emit('post.published', testPost);
        ping1.isDone().should.be.true();
        ping2.isDone().should.be.true();
    });
});
