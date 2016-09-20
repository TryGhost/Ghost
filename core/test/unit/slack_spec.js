var _               = require('lodash'),
    nock            = require('nock'),
    should          = require('should'),
    sinon           = require('sinon'),
    rewire          = require('rewire'),
    Promise         = require('bluebird'),
    testUtils       = require('../utils'),
    url             = require('url'),

// Stuff we test
    slack          = rewire('../../server/data/slack'),
    events         = require('../../server/events'),
    api            = require('../../server/api/settings'),
    config         = require('../../server/config'),
    schema         = require('../../server/data/schema').checks,

    sandbox        = sinon.sandbox.create(),
// Test data
    slackObjNoUrl =
        {
            id: 17,
            uuid: '50f50671-6e7c-4636-85e0-2962967764fa',
            key: 'slack',
            value: '[{"url":""}]',
            type: 'blog',
            created_at: '2016-04-06T15:19:19.492Z',
            created_by: 1,
            updated_at: '2016-04-06T15:19:19.492Z',
            updated_by: 1
        },
    slackObjWithUrl =
        {
            id: 17,
            uuid: '50f50671-6e7c-4636-85e0-2962967764fa',
            key: 'slack',
            value: '[{"url":"https://hooks.slack.com/services/a-b-c-d"}]',
            type: 'blog',
            created_at: '2016-04-06T15:19:19.492Z',
            created_by: 1,
            updated_at: '2016-04-06T15:19:19.492Z',
            updated_by: 1
        };

// To stop jshint complaining
should.equal(true, true);

describe('Slack', function () {
    var eventStub;

    beforeEach(function () {
        eventStub = sandbox.stub(events, 'on');
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('listen() should initialise event correctly', function () {
        slack.listen();
        eventStub.calledTwice.should.be.true();
        eventStub.firstCall.calledWith('post.published', slack.__get__('listener')).should.be.true();
        eventStub.secondCall.calledWith('slack.test', slack.__get__('testPing')).should.be.true();
    });

    it('listener() calls ping() with toJSONified model', function () {
        var testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
            testModel = {toJSON: function () {return testPost; }},
            pingStub = sandbox.stub(),
            resetSlack = slack.__set__('ping', pingStub),
            listener = slack.__get__('listener');

        listener(testModel);

        pingStub.calledOnce.should.be.true();
        pingStub.calledWith(testPost).should.be.true();

        // Reset slack ping method
        resetSlack();
    });

    it('testPing() calls ping() with default message', function () {
        var pingStub = sandbox.stub(),
            resetSlack = slack.__set__('ping', pingStub),
            testPing = slack.__get__('testPing');

        testPing();

        pingStub.calledOnce.should.be.true();
        pingStub.calledWith(sinon.match.has('message')).should.be.true();

        // Reset slack ping method
        resetSlack();
    });

    describe('makeRequest()', function () {
        var makeRequest = slack.__get__('makeRequest');

        it('should make request to slack correctly', function () {
            // set up
            var reqOptions,
                pingSlack;

            // fill the options for https request
            reqOptions = url.parse('https://hooks.slack.com/services/a-b-c-d');
            reqOptions.method = 'POST';
            reqOptions.headers = {'Content-type': 'application/json'};

            pingSlack = nock('https://hooks.slack.com/')
                .post('/services/a-b-c-d', {text:'http://myblog.com/mypost', icon_url: 'http://myblog.com/someImageurl.jpg', username: 'Ghost'})
                .reply(200);

            // execute code
            makeRequest(reqOptions, {text:'http://myblog.com/mypost', icon_url: 'http://myblog.com/someImageurl.jpg', username: 'Ghost'});

            // assertions
            pingSlack.isDone().should.be.true();
        });

        it('can handle an error response correctly', function () {
            // set up
            var reqOptions,
                pingSlack;

            // fill the options for https request
            reqOptions = url.parse('https://hooks.slack.com/services/a-b-c-d');
            reqOptions.method = 'POST';
            reqOptions.headers = {'Content-type': 'application/json'};

            pingSlack = nock('https://hooks.slack.com/')
                .post('/services/a-b-c-d', {text:'http://myblog.com/mypost', icon_url: 'http://myblog.com/someImageurl.jpg', username: 'Ghost'})
                .replyWithError(404);

            // execute code
            makeRequest(reqOptions, {text:'http://myblog.com/mypost', icon_url: 'http://myblog.com/someImageurl.jpg', username: 'Ghost'});

            // assertions
            pingSlack.isDone().should.be.true();
        });
    });

    describe('ping()', function () {
        var makeRequestAssertions,
            isPostStub,
            urlForStub,
            settingsAPIStub,
            settingsObj,
            slackReset,
            makeRequestMock,
            makeRequestSpy,
            ping =  slack.__get__('ping');

        beforeEach(function () {
            isPostStub = sandbox.stub(schema, 'isPost');
            urlForStub = sandbox.stub(config, 'urlFor');
            urlForStub.withArgs('post').returns('http://myblog.com/post');
            urlForStub.returns('http://myblog.com/someImageurl.jpg');
            settingsObj = {settings: [], meta: {}};
            settingsAPIStub = sandbox.stub(api, 'read').returns(Promise.resolve(settingsObj));

            makeRequestMock = function () {
                makeRequestAssertions.apply(this, arguments);
            };
            makeRequestSpy = sandbox.spy(makeRequestMock);
            slackReset = slack.__set__('makeRequest', makeRequestMock);
        });

        afterEach(function () {
            slackReset();
        });

        it('makes a request for a post if url is provided', function (done) {
            // set up
            isPostStub.returns(true);
            settingsObj.settings[0] = slackObjWithUrl;

            // assertions
            makeRequestAssertions = function (requestOptions, requestData) {
                isPostStub.calledOnce.should.be.true();
                urlForStub.calledTwice.should.be.true();
                settingsAPIStub.calledOnce.should.be.true();
                requestOptions.should.have.property('href').and.be.equal('https://hooks.slack.com/services/a-b-c-d');
                requestData.should.have.property('text').and.be.equal('http://myblog.com/post');
                requestData.should.have.property('icon_url').and.be.equal('http://myblog.com/someImageurl.jpg');
                requestData.should.have.property('username').and.be.equal('Ghost');
                done();
            };

            // execute code
            ping({}).catch(done);
        });

        it('makes a request for a message if url is provided', function (done) {
            isPostStub.returns(false);
            settingsObj.settings[0] = slackObjWithUrl;

            // assertions
            makeRequestAssertions = function (requestOptions, requestData) {
                isPostStub.calledOnce.should.be.true();
                urlForStub.calledOnce.should.be.true();
                settingsAPIStub.calledOnce.should.be.true();
                requestOptions.should.have.property('href').and.be.equal('https://hooks.slack.com/services/a-b-c-d');
                requestData.should.have.property('text').and.be.equal('Hi!');
                requestData.should.have.property('icon_url').and.be.equal('http://myblog.com/someImageurl.jpg');
                requestData.should.have.property('username').and.be.equal('Ghost');
                done();
            };

            ping({message: 'Hi!'}).catch(done);
        });

        it('does not make a request if post is a page', function (done) {
            // set up
            isPostStub.returns(true);
            settingsObj.settings[0] = slackObjWithUrl;

            // execute code
            ping({page: true}).then(function (result) {
                // assertions
                isPostStub.calledOnce.should.be.true();
                urlForStub.calledOnce.should.be.true();
                settingsAPIStub.calledOnce.should.be.true();
                makeRequestSpy.called.should.be.false();
                should.not.exist(result);
                done();
            }).catch(done);
        });

        it('does not make a request if no url is provided', function (done) {
            // set up
            isPostStub.returns(true);
            settingsObj.settings[0] = slackObjNoUrl;

            // execute code
            ping({}).then(function (result) {
                // assertions
                isPostStub.calledOnce.should.be.true();
                urlForStub.calledOnce.should.be.true();
                settingsAPIStub.calledOnce.should.be.true();
                makeRequestSpy.called.should.be.false();
                should.not.exist(result);
                done();
            }).catch(done);
        });

        it('does not send webhook for \'welcome-to-ghost\' post', function (done) {
            // set up
            isPostStub.returns(true);
            settingsObj.settings[0] = slackObjWithUrl;

            // execute code
            ping({slug: 'welcome-to-ghost'}).then(function (result) {
                // assertions
                isPostStub.calledOnce.should.be.true();
                urlForStub.calledOnce.should.be.true();
                settingsAPIStub.calledOnce.should.be.true();
                makeRequestSpy.called.should.be.false();
                should.not.exist(result);
                done();
            }).catch(done);
        });

        it('handles broken slack settings', function (done) {
            settingsObj.settings[0] = '';

            ping({}).then(function () {
                done('This should not get called');
            }).catch(function () {
                isPostStub.calledOnce.should.be.true();
                urlForStub.calledOnce.should.be.false();
                settingsAPIStub.calledOnce.should.be.true();
                makeRequestSpy.called.should.be.false();
                done();
            });
        });
    });
});
