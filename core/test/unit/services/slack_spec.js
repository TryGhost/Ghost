var should = require('should'), // jshint ignore:line,
    sinon = require('sinon'),
    _ = require('lodash'),
    nock = require('nock'),
    rewire = require('rewire'),
    url = require('url'),
    testUtils = require('../../utils'),
    configUtils = require('../../utils/configUtils'),

    // Stuff we test
    slack = rewire('../../../server/services/slack'),
    events = require('../../../server/events'),
    utils = require('../../../server/utils'),
    schema = require('../../../server/data/schema').checks,
    settingsCache = require('../../../server/settings/cache'),

    sandbox = sinon.sandbox.create(),

    // Test data
    slackObjNoUrl = [{url: ''}],
    slackObjWithUrl = [{url: 'https://hooks.slack.com/services/a-b-c-d'}];

describe('Slack', function () {
    var eventStub;

    beforeEach(function () {
        eventStub = sandbox.stub(events, 'on');
    });

    afterEach(function () {
        sandbox.restore();
        configUtils.restore();
    });

    it('listen() should initialise event correctly', function () {
        slack.listen();
        eventStub.calledTwice.should.be.true();
        eventStub.firstCall.calledWith('post.published', slack.__get__('listener')).should.be.true();
        eventStub.secondCall.calledWith('slack.test', slack.__get__('testPing')).should.be.true();
    });

    it('listener() calls ping() with toJSONified model', function () {
        var testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
            testModel = {
                toJSON: function () {
                    return testPost;
                }
            },
            pingStub = sandbox.stub(),
            resetSlack = slack.__set__('ping', pingStub),
            listener = slack.__get__('listener');

        listener(testModel);

        pingStub.calledOnce.should.be.true();
        pingStub.calledWith(testPost).should.be.true();

        // Reset slack ping method
        resetSlack();
    });

    it('listener() does not call ping() when importing', function () {
        var testPost = _.clone(testUtils.DataGenerator.Content.posts[2]),
            testModel = {
                toJSON: function () {
                    return testPost;
                }
            },
            pingStub = sandbox.stub(),
            resetSlack = slack.__set__('ping', pingStub),
            listener = slack.__get__('listener');

        listener(testModel, {importing: true});

        pingStub.calledOnce.should.be.false();

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
                .post('/services/a-b-c-d', {
                    text: 'http://myblog.com/mypost',
                    icon_url: 'http://myblog.com/someImageurl.jpg',
                    username: 'Ghost'
                })
                .reply(200);

            // execute code
            makeRequest(reqOptions, {
                text: 'http://myblog.com/mypost',
                icon_url: 'http://myblog.com/someImageurl.jpg',
                username: 'Ghost'
            });

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
                .post('/services/a-b-c-d', {
                    text: 'http://myblog.com/mypost',
                    icon_url: 'http://myblog.com/someImageurl.jpg',
                    username: 'Ghost'
                })
                .replyWithError(404);

            // execute code
            makeRequest(reqOptions, {
                text: 'http://myblog.com/mypost',
                icon_url: 'http://myblog.com/someImageurl.jpg',
                username: 'Ghost'
            });

            // assertions
            pingSlack.isDone().should.be.true();
        });
    });

    describe('ping()', function () {
        var isPostStub,
            urlForSpy,
            settingsCacheStub,

            slackReset,
            makeRequestStub,
            ping = slack.__get__('ping');

        beforeEach(function () {
            isPostStub = sandbox.stub(schema, 'isPost');
            urlForSpy = sandbox.spy(utils.url, 'urlFor');

            settingsCacheStub = sandbox.stub(settingsCache, 'get');

            makeRequestStub = sandbox.stub();
            slackReset = slack.__set__('makeRequest', makeRequestStub);

            configUtils.set('url', 'http://myblog.com');
        });

        afterEach(function () {
            slackReset();
        });

        it('makes a request for a post if url is provided', function () {
            var requestOptions, requestData;

            isPostStub.returns(true);
            settingsCacheStub.withArgs('slack').returns(slackObjWithUrl);

            // execute code
            ping({});

            // assertions
            makeRequestStub.calledOnce.should.be.true();
            isPostStub.calledOnce.should.be.true();
            urlForSpy.calledTwice.should.be.true();
            settingsCacheStub.calledWith('slack').should.be.true();

            requestOptions = makeRequestStub.firstCall.args[0];
            requestData = makeRequestStub.firstCall.args[1];

            requestOptions.should.have.property('href').and.be.equal('https://hooks.slack.com/services/a-b-c-d');
            requestData.should.have.property('text').and.be.equal('http://myblog.com/');
            requestData.should.have.property('icon_url').and.be.equal('http://myblog.com/favicon.ico');
            requestData.should.have.property('username').and.be.equal('Ghost');
        });

        it('makes a request for a message if url is provided', function () {
            var requestOptions, requestData;

            isPostStub.returns(false);
            settingsCacheStub.withArgs('slack').returns(slackObjWithUrl);

            configUtils.set('url', 'https://myblog.com');

            // execute code
            ping({message: 'Hi!'});

            // assertions
            makeRequestStub.calledOnce.should.be.true();
            isPostStub.calledOnce.should.be.true();
            urlForSpy.calledOnce.should.be.true();
            settingsCacheStub.calledWith('slack').should.be.true();

            requestOptions = makeRequestStub.firstCall.args[0];
            requestData = makeRequestStub.firstCall.args[1];

            requestOptions.should.have.property('href').and.be.equal('https://hooks.slack.com/services/a-b-c-d');
            requestData.should.have.property('text').and.be.equal('Hi!');
            requestData.should.have.property('icon_url').and.be.equal('https://myblog.com/favicon.ico');
            requestData.should.have.property('username').and.be.equal('Ghost');
        });

        it('does not make a request if post is a page', function () {
            // set up
            isPostStub.returns(true);
            settingsCacheStub.withArgs('slack').returns(slackObjWithUrl);

            // execute code
            ping({page: true});

            // assertions
            makeRequestStub.calledOnce.should.be.false();
            isPostStub.calledOnce.should.be.true();
            urlForSpy.calledOnce.should.be.true();
            settingsCacheStub.calledWith('slack').should.be.true();
        });

        it('does not make a request if no url is provided', function () {
            // set up
            isPostStub.returns(true);
            settingsCacheStub.withArgs('slack').returns(slackObjNoUrl);

            // execute code
            ping({});
            // assertions
            makeRequestStub.calledOnce.should.be.false();
            isPostStub.calledOnce.should.be.true();
            urlForSpy.calledOnce.should.be.true();
            settingsCacheStub.calledWith('slack').should.be.true();
        });

        it('does not send webhook for \'welcome\' post', function () {
            // set up
            isPostStub.returns(true);
            settingsCacheStub.withArgs('slack').returns(slackObjWithUrl);

            // execute code
            ping({slug: 'welcome'});

            // assertions
            makeRequestStub.calledOnce.should.be.false();
            isPostStub.calledOnce.should.be.true();
            urlForSpy.calledOnce.should.be.true();
            settingsCacheStub.calledWith('slack').should.be.true();
        });

        it('handles broken slack settings', function () {
            // set up
            settingsCacheStub.withArgs('slack').returns();

            // execute code
            ping({});

            // assertions
            makeRequestStub.calledOnce.should.be.false();
            isPostStub.calledOnce.should.be.true();
            urlForSpy.calledOnce.should.be.false();
            settingsCacheStub.calledWith('slack').should.be.true();
        });
    });
});
