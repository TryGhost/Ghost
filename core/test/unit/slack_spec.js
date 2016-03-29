/*globals describe, beforeEach, afterEach, it*/
var nock            = require('nock'),
    should          = require('should'),
    sinon           = require('sinon'),
    Promise         = require('bluebird'),
    testUtils       = require('../utils'),
    url             = require('url'),

// Stuff we test
    slack          = require('../../server/data/slack'),
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
    var testPost;

    afterEach(function () {
        sandbox.restore();
    });

    it('should call ping if post is published', function () {
        // set up
        var ping = sandbox.stub(slack, '_ping');
        testPost = {
                toJSON: function () {
                    return testUtils.DataGenerator.Content.posts[2];
                }
            };
        // execute code
        slack.init();
        events.emit('post.published', testPost);

        // assertions
        ping.calledOnce.should.be.true();
    });

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
        slack._makeRequest(reqOptions, {text:'http://myblog.com/mypost', icon_url: 'http://myblog.com/someImageurl.jpg', username: 'Ghost'});

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
        slack._makeRequest(reqOptions, {text:'http://myblog.com/mypost', icon_url: 'http://myblog.com/someImageurl.jpg', username: 'Ghost'});

        // assertions
        pingSlack.isDone().should.be.true();
    });

    describe('Ping', function () {
        var makeRequestAssertions,
            schemaStub,
            urlForStub,
            settingsAPIStub,
            settingsObj,
            makeRequestStub;

        beforeEach(function () {
            schemaStub = sandbox.stub(schema, 'isPost');
            urlForStub = sandbox.stub(config, 'urlFor');
            urlForStub.onFirstCall().returns('http://myblog.com/post');
            urlForStub.onSecondCall().returns('http://myblog.com/someImageurl.jpg');
            settingsObj = {settings: [], meta: {}};
            settingsAPIStub = sandbox.stub(api, 'read').returns(Promise.resolve(settingsObj));
            makeRequestStub = sandbox.stub(slack, '_makeRequest', function () {
                makeRequestAssertions.apply(this, arguments);
            });
        });

        it('makes a request if url is provided', function (done) {
            // set up
            schemaStub.returns('true');
            settingsObj.settings[0] = slackObjWithUrl;

            // assertions
            makeRequestAssertions = function (requestOptions, requestData) {
                    schemaStub.calledOnce.should.be.true();
                    urlForStub.calledTwice.should.be.true();
                    settingsAPIStub.calledOnce.should.be.true();
                    requestOptions.should.have.property('href').and.be.equal('https://hooks.slack.com/services/a-b-c-d');
                    requestData.should.have.property('text').and.be.equal('http://myblog.com/post');
                    requestData.should.have.property('icon_url').and.be.equal('http://myblog.com/someImageurl.jpg');
                    requestData.should.have.property('username').and.be.equal('Ghost');
                    done();
                };

            // execute code
            slack._ping({}).catch(done);
        });

        it('does not make a request if no url is provided', function (done) {
            // set up
            schemaStub.returns('true');
            settingsObj.settings[0] = slackObjNoUrl;

            // execute code
            slack._ping({}).then(function (result) {
                // assertions
                schemaStub.calledOnce.should.be.true();
                urlForStub.calledOnce.should.be.true();
                settingsAPIStub.calledOnce.should.be.true();
                makeRequestStub.called.should.be.false();
                should.not.exist(result);
                done();
            }).catch(done);
        });

        it('does not send webhook for \'welcome-to-ghost\' post', function (done) {
            // set up
            schemaStub.returns('true');
            settingsObj.settings[0] = slackObjWithUrl;

            makeRequestAssertions = function () {};
            // execute code
            slack._ping({slug: 'welcome-to-ghost'}).then(function (result) {
                // assertions
                schemaStub.calledOnce.should.be.true();
                urlForStub.calledOnce.should.be.true();
                settingsAPIStub.calledOnce.should.be.true();
                makeRequestStub.called.should.be.false();
                should.not.exist(result);
                done();
            }).catch(done);
        });
    });
});
