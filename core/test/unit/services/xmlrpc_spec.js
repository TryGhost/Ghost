var should = require('should'), // jshint ignore:line
    sinon = require('sinon'),
    _ = require('lodash'),
    nock = require('nock'),
    http = require('http'),
    rewire = require('rewire'),
    testUtils = require('../../utils'),
    configUtils = require('../../utils/configUtils'),
    xmlrpc = rewire('../../../server/services/xmlrpc'),
    events = require('../../../server/events'),
    logging = require('../../../server/logging'),

    sandbox = sinon.sandbox.create();

describe('XMLRPC', function () {
    var eventStub;

    beforeEach(function () {
        eventStub = sandbox.stub(events, 'on');
        configUtils.set('privacy:useRpcPing', true);
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
        nock.cleanAll();
    });

    it('listen() should initialise event correctly', function () {
        xmlrpc.listen();
        eventStub.calledOnce.should.be.true();
        eventStub.calledWith('post.published', xmlrpc.__get__('listener')).should.be.true();
    });

    it('listener() calls ping() with toJSONified model', function () {
        var testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
            testModel = {
                toJSON: function () {
                    return testPost;
                }
            },
            pingStub = sandbox.stub(),
            resetXmlRpc = xmlrpc.__set__('ping', pingStub),
            listener = xmlrpc.__get__('listener');

        listener(testModel);

        pingStub.calledOnce.should.be.true();
        pingStub.calledWith(testPost).should.be.true();

        // Reset xmlrpc ping method
        resetXmlRpc();
    });

    it('listener() does not call ping() when importing', function () {
        var testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
            testModel = {
                toJSON: function () {
                    return testPost;
                }
            },
            pingStub = sandbox.stub(),
            resetXmlRpc = xmlrpc.__set__('ping', pingStub),
            listener = xmlrpc.__get__('listener');

        listener(testModel, {importing: true});

        pingStub.calledOnce.should.be.false();

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

            testPost.slug = 'welcome';

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

        it('captures && logs errors from requests', function () {
            var testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
                httpMock = sandbox.stub(http, 'request').returns({
                    write: function () {
                    },
                    end: function () {
                    },
                    on: function (eventName, eventDone) {
                        eventDone(new Error('ping site is down'));
                    }
                }),
                loggingStub = sandbox.stub(logging, 'error');

            ping(testPost);

            should.exist(httpMock);
            // pinglist contains 2 endpoints, both return ping site is down
            loggingStub.calledTwice.should.eql(true);
            loggingStub.args[0][0].message.should.eql('ping site is down');
        });
    });
});
