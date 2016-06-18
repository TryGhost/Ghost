var _               = require('lodash'),
    nock            = require('nock'),
    should          = require('should'),
    sinon           = require('sinon'),
    rewire          = require('rewire'),
    testUtils       = require('../utils'),
    configUtils     = require('../utils/configUtils'),
    xmlrpc          = rewire('../../server/data/xml/xmlrpc'),
    events          = require('../../server/events'),
    // storing current environment
    currentEnv      = process.env.NODE_ENV;

// To stop jshint complaining
should.equal(true, true);

describe('XMLRPC', function () {
    var sandbox, eventStub;

    beforeEach(function () {
        sandbox = sinon.sandbox.create();
        eventStub = sandbox.stub(events, 'on');
        // give environment a value that will ping
        process.env.NODE_ENV = 'production';
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
        nock.cleanAll();
        // reset the environment
        process.env.NODE_ENV = currentEnv;
    });

    it('listen() should initialise event correctly', function () {
        xmlrpc.listen();
        eventStub.calledOnce.should.be.true();
        eventStub.calledWith('post.published', xmlrpc.__get__('listener')).should.be.true();
    });

    it('listener() calls ping() with toJSONified model', function () {
        var testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
            testModel = {toJSON: function () {return testPost; }},
            pingStub = sandbox.stub(),
            resetXmlRpc = xmlrpc.__set__('ping', pingStub),
            listener = xmlrpc.__get__('listener');

        listener(testModel);

        pingStub.calledOnce.should.be.true();
        pingStub.calledWith(testPost).should.be.true();

        // Reset xmlrpc ping method
        resetXmlRpc();
    });

    describe('ping()', function () {
        var ping = xmlrpc.__get__('ping');

        it('with a post should execute two pings', function () {
            var ping1 = nock('http://blogsearch.google.com').post('/ping/RPC2').reply(200),
                ping2 = nock('http://rpc.pingomatic.com').post('/').reply(200),
                testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            ping(testPost);

            ping1.isDone().should.be.true();
            ping2.isDone().should.be.true();
        });

        it('with default post should not execute pings', function () {
            var ping1 = nock('http://blogsearch.google.com').post('/ping/RPC2').reply(200),
                ping2 = nock('http://rpc.pingomatic.com').post('/').reply(200),
                testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            testPost.slug = 'welcome-to-ghost';

            ping(testPost);

            ping1.isDone().should.be.false();
            ping2.isDone().should.be.false();
        });

        it('with a page should not execute pings', function () {
            var ping1 = nock('http://blogsearch.google.com').post('/ping/RPC2').reply(200),
                ping2 = nock('http://rpc.pingomatic.com').post('/').reply(200),
                testPage = _.clone(testUtils.DataGenerator.Content.posts[5]);

            ping(testPage);

            ping1.isDone().should.be.false();
            ping2.isDone().should.be.false();
        });

        it('when privacy.useRpcPing is false should not execute pings', function () {
            var ping1 = nock('http://blogsearch.google.com').post('/ping/RPC2').reply(200),
                ping2 = nock('http://rpc.pingomatic.com').post('/').reply(200),
                testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

            configUtils.set({privacy: {useRpcPing: false}});

            ping(testPost);

            ping1.isDone().should.be.false();
            ping2.isDone().should.be.false();
        });

        it('captures errors from requests', function (done) {
            var ping1 = nock('http://blogsearch.google.com').post('/ping/RPC2').reply(200),
                ping2 = nock('http://rpc.pingomatic.com').post('/').replyWithError('ping site is down'),
                testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
                errorMock, resetXmlRpc;

            errorMock = {
                logError: function logError(error) {
                    should.exist(error);
                    error.message.should.eql('ping site is down');

                    // Reset xmlrpc handleError method and exit test
                    resetXmlRpc();
                    done();
                }
            };

            resetXmlRpc = xmlrpc.__set__('errors', errorMock);

            ping(testPost);

            ping1.isDone().should.be.true();
            ping2.isDone().should.be.true();
        });
    });
});
