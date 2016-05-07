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
    sandbox        = sinon.sandbox.create(),
// Test data
    slackObjNoUrl =
        {
            id: 17,
            uuid: '50f50671-6e7c-4636-85e0-2962967764fa',
            key: 'slack',
            value: '[{"url":"/", "channel":"", "username":"", "icon":":ghost:", "isActive":true}]',
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
            value: '[{"url":"https://hooks.slack.com/services/a-b-c-d", "channel":"", "username":"", "icon":":ghost:", "isActive":true}]',
            type: 'blog',
            created_at: '2016-04-06T15:19:19.492Z',
            created_by: 1,
            updated_at: '2016-04-06T15:19:19.492Z',
            updated_by: 1
        },
    slackObjNotActive =
        {
            id: 17,
            uuid: '50f50671-6e7c-4636-85e0-2962967764fa',
            key: 'slack',
            value: '[{"url":"https://hooks.slack.com/services/a-b-c-d", "channel":"", "username":"", "icon":":ghost:", "isActive":false}]',
            type: 'blog',
            created_at: '2016-04-06T15:19:19.492Z',
            created_by: 1,
            updated_at: '2016-04-06T15:19:19.492Z',
            updated_by: 1
        },
    slackObjWithChannel =
        {
            id: 17,
            uuid: '50f50671-6e7c-4636-85e0-2962967764fa',
            key: 'slack',
            value: '[{"url":"https://hooks.slack.com/services/a-b-c-d", "channel":"test-slack_", "username":"", "icon":":ghost:", "isActive":true}]',
            type: 'blog',
            created_at: '2016-04-06T15:19:19.492Z',
            created_by: 1,
            updated_at: '2016-04-06T15:19:19.492Z',
            updated_by: 1
        },
    slackObjWithUser =
        {
            id: 17,
            uuid: '50f50671-6e7c-4636-85e0-2962967764fa',
            key: 'slack',
            value: '[{"url":"https://hooks.slack.com/services/a-b-c-d", "channel":"", "username":"webhookbot", "icon":":ghost:", "isActive":true}]',
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
                        .post('/services/a-b-c-d', {text:'http://myblog.com/mypost'})
                        .reply(200);
        // execute code
        slack._makeRequest(reqOptions, {text:'http://myblog.com/mypost'});

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
                        .post('/services/a-b-c-d', {text:'http://myblog.com/mypost'})
                        .replyWithError(404);
        // execute code
        slack._makeRequest(reqOptions, {text:'http://myblog.com/mypost'});

        // assertions
        pingSlack.isDone().should.be.true();
    });

    describe('Ping', function () {
        var makeRequestAssertions,
            urlForStub,
            settingsAPIStub,
            settingsObj,
            makeRequestStub;

        beforeEach(function () {
            urlForStub = sandbox.stub(config, 'urlFor').returns('http://myblog.com/post');
            settingsObj = {settings: [], meta: {}};
            settingsAPIStub = sandbox.stub(api, 'read').returns(Promise.resolve(settingsObj));
            makeRequestStub = sandbox.stub(slack, '_makeRequest', function () {
                makeRequestAssertions.apply(this, arguments);
            });
        });

        it('makes a request if url is provided', function (done) {
            // set up
            settingsObj.settings[0] = slackObjWithUrl;

            // assertions
            makeRequestAssertions = function (requestOptions, requestData) {
                    urlForStub.calledOnce.should.be.true();
                    settingsAPIStub.calledOnce.should.be.true();
                    requestOptions.should.have.property('href').and.be.equal('https://hooks.slack.com/services/a-b-c-d');
                    requestData.should.have.property('text').and.be.equal('http://myblog.com/post');
                    done();
                };

            // execute code
            slack._ping({}).catch(done);
        });

        it('does not make a request if no url is provided', function (done) {
            // set up
            settingsObj.settings[0] = slackObjNoUrl;

            // execute code
            slack._ping({}).then(function (result) {
                // assertions
                urlForStub.calledOnce.should.be.true();
                settingsAPIStub.calledOnce.should.be.true();
                makeRequestStub.called.should.be.false();
                should.not.exist(result);
                done();
            }).catch(done);
        });

        it('should send slack a channel if a channel is provided', function (done) {
            // set up
            settingsObj.settings[0] = slackObjWithChannel;

            // assertions
            makeRequestAssertions = function (requestOptions, requestData) {
                    urlForStub.calledOnce.should.be.true();
                    settingsAPIStub.calledOnce.should.be.true();
                    requestOptions.should.have.property('href').and.be.equal('https://hooks.slack.com/services/a-b-c-d');
                    requestData.should.have.property('text').and.be.equal('http://myblog.com/post');
                    requestData.should.have.property('channel').and.be.equal('test-slack_');
                    done();
                };

            // execute code
            slack._ping({}).catch(done);
        });

        it('should not ping slack if slack is not activated', function (done) {
            // set up
            settingsObj.settings[0] = slackObjNotActive;

            // execute code
            slack._ping({}).then(function (result) {
                // assertions
                urlForStub.calledOnce.should.be.true();
                settingsAPIStub.calledOnce.should.be.true();
                makeRequestStub.called.should.be.false();
                should.not.exist(result);
                done();
            }).catch(done);
        });

        it('should send slack a username if a username is provided', function (done) {
            // set up
            settingsObj.settings[0] = slackObjWithUser;

            // assertions
            makeRequestAssertions = function (requestOptions, requestData) {
                    urlForStub.calledOnce.should.be.true();
                    settingsAPIStub.calledOnce.should.be.true();
                    requestOptions.should.have.property('href').and.be.equal('https://hooks.slack.com/services/a-b-c-d');
                    requestData.should.have.property('text').and.be.equal('http://myblog.com/post');
                    requestData.should.have.property('username').and.be.equal('webhookbot');
                    done();
                };

            // execute code
            slack._ping({}).catch(done);
        });

        it('does not send webhook for \'welcome-to-ghost\' post', function (done) {
            // set up
            settingsObj.settings[0] = slackObjWithUrl;

            makeRequestAssertions = function () {};
            // execute code
            slack._ping({slug: 'welcome-to-ghost'}).then(function (result) {
                // assertions
                urlForStub.calledOnce.should.be.true();
                settingsAPIStub.calledOnce.should.be.true();
                makeRequestStub.called.should.be.false();
                should.not.exist(result);
                done();
            }).catch(done);
        });
    });
});
