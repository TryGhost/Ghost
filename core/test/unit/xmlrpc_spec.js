/*globals describe, beforeEach, afterEach, it*/
/*jshint expr:true*/
var nock            = require('nock'),
    should          = require('should'),                           // jshint ignore:line
    testUtils       = require('../utils'),
    events          = require('../../server/events'),
    rewire          = require('rewire'),

    // code under test
    xmlrpc          = rewire('../../server/data/xml/xmlrpc'),

    // storing current environment
    currentEnv      = process.env.NODE_ENV;

describe('XMLRPC', function () {
    var ping1, ping2, testPost;
    beforeEach(function () {
        ping1 = nock('http://blogsearch.google.com').post('/ping/RPC2').reply(200);
        ping2 = nock('http://rpc.pingomatic.com').post('/').reply(200);
        testPost = {
            toJSON: function () {
                return testUtils.DataGenerator.Content.posts[2];
            }
        };
    });

    describe('in the production environment', function () {
        beforeEach(function () {
            // give environment a value that will ping
            process.env.NODE_ENV = 'production';
        });

        afterEach(function () {
            // reset the environment
            process.env.NODE_ENV = currentEnv;
        });

        it('should execute two pings', function () {
            xmlrpc.init();
            events.emit('post.published', testPost);
            ping1.isDone().should.be.true;
            ping2.isDone().should.be.true;
        });

        describe('before the blog path is available', function () {
            var config, defaultTestingUrl;
            beforeEach(function () {
                config = xmlrpc.__get__('config')._config;
                defaultTestingUrl = config.url;
                delete config.url;
            });
            afterEach(function () {
                // restore because tests don't reload config between each
                config.url = defaultTestingUrl;
            });

            it('should not ping', function () {
                xmlrpc.init();
                events.emit('post.published', testPost);
                ping1.isDone().should.be.false;
                ping2.isDone().should.be.false;
            });
        });
    });

    describe('in non-production environments', function () {
        it('should not ping', function () {
            xmlrpc.init();
            events.emit('post.published', testPost);
            ping1.isDone().should.be.false;
            ping2.isDone().should.be.false;
        });
    });
});
