const sinon = require('sinon');
const _ = require('lodash');
const rewire = require('rewire');
const testUtils = require('../../../utils');
const configUtils = require('../../../utils/configUtils');

// Stuff we test
const slack = rewire('../../../../core/server/services/slack');

const events = require('../../../../core/server/lib/common/events');
const logging = require('@tryghost/logging');
const imageLib = require('../../../../core/server/lib/image');
const urlService = require('../../../../core/server/services/url');
const settingsCache = require('../../../../core/shared/settings-cache');

// Test data
const slackURL = 'https://hooks.slack.com/services/a-b-c-d';

describe('Slack', function () {
    let eventStub;
    let loggingStub;

    beforeEach(function () {
        eventStub = sinon.stub(events, 'on');
    });

    afterEach(async function () {
        sinon.restore();
        await configUtils.restore();
    });

    it('listen() should initialise event correctly', function () {
        slack.listen();
        eventStub.calledTwice.should.be.true();
        eventStub.firstCall.calledWith('post.published', slack.__get__('slackListener')).should.be.true();
        eventStub.secondCall.calledWith('slack.test', slack.__get__('slackTestPing')).should.be.true();
    });

    it('listener() calls ping() with toJSONified model', function () {
        const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

        const testModel = {
            toJSON: function () {
                return testPost;
            }
        };

        const pingStub = sinon.stub();
        const resetSlack = slack.__set__('ping', pingStub);
        const listener = slack.__get__('slackListener');

        listener(testModel);

        pingStub.calledOnce.should.be.true();
        pingStub.calledWith(testPost).should.be.true();

        // Reset slack ping method
        resetSlack();
    });

    it('listener() does not call ping() when importing', function () {
        const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);

        const testModel = {
            toJSON: function () {
                return testPost;
            }
        };

        const pingStub = sinon.stub();
        const resetSlack = slack.__set__('ping', pingStub);
        const listener = slack.__get__('slackListener');

        listener(testModel, {importing: true});

        pingStub.calledOnce.should.be.false();

        // Reset slack ping method
        resetSlack();
    });

    it('testPing() calls ping() with default message', function () {
        const pingStub = sinon.stub();
        const resetSlack = slack.__set__('ping', pingStub);
        const testPing = slack.__get__('slackTestPing');

        testPing();

        pingStub.calledOnce.should.be.true();
        pingStub.calledWith(sinon.match.has('message')).should.be.true();

        // Reset slack ping method
        resetSlack();
    });

    describe('ping()', function () {
        let settingsCacheStub;
        let slackReset;
        let makeRequestStub;
        const ping = slack.__get__('ping');

        beforeEach(function () {
            sinon.stub(urlService, 'getUrlByResourceId');

            settingsCacheStub = sinon.stub(settingsCache, 'get');

            makeRequestStub = sinon.stub();
            slackReset = slack.__set__('request', makeRequestStub);
            makeRequestStub.resolves();

            sinon.stub(imageLib.blogIcon, 'getIconUrl').returns('http://myblog.com/favicon.ico');

            configUtils.set('url', 'http://myblog.com');
        });

        afterEach(function () {
            slackReset();
        });

        it('makes a request for a post if url is provided', function () {
            let requestUrl;
            let requestData;

            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'webhook-test'});
            urlService.getUrlByResourceId.withArgs(post.id, {absolute: true}).returns('http://myblog.com/' + post.slug + '/');

            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            ping(post);

            // assertions
            makeRequestStub.calledOnce.should.be.true();
            urlService.getUrlByResourceId.calledOnce.should.be.true();
            settingsCacheStub.calledWith('slack_url').should.be.true();

            requestUrl = makeRequestStub.firstCall.args[0];
            requestData = JSON.parse(makeRequestStub.firstCall.args[1].body);

            requestUrl.should.equal(slackURL);
            requestData.attachments[0].title.should.equal(post.title);
            requestData.attachments[0].title_link.should.equal('http://myblog.com/webhook-test/');
            requestData.attachments[0].fields[0].value.should.equal('## markdown.');
            requestData.attachments[0].should.not.have.property('author_name');
            requestData.icon_url.should.equal('http://myblog.com/favicon.ico');

            requestData.username.should.equal('Ghost');
            requestData.unfurl_links.should.equal(true);
        });

        it('makes a request for a message if url is provided', function () {
            let requestUrl;
            let requestData;

            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            ping({message: 'Hi!'});

            // assertions
            makeRequestStub.calledOnce.should.be.true();
            urlService.getUrlByResourceId.called.should.be.false();
            settingsCacheStub.calledWith('slack_url').should.be.true();

            requestUrl = makeRequestStub.firstCall.args[0];
            requestData = JSON.parse(makeRequestStub.firstCall.args[1].body);

            requestUrl.should.equal(slackURL);
            requestData.text.should.equal('Hi!');
            requestData.icon_url.should.equal('http://myblog.com/favicon.ico');
            requestData.username.should.equal('Ghost');
            requestData.unfurl_links.should.equal(true);
        });

        it('makes a request and errors', function (done) {
            loggingStub = sinon.stub(logging, 'error');
            makeRequestStub.rejects();
            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            ping({});

            (function retry() {
                if (loggingStub.calledOnce) {
                    makeRequestStub.calledOnce.should.be.true();
                    return done();
                }

                setTimeout(retry, 50);
            }());
        });

        it('does not make a request if post is a page', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({type: 'page'});
            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            ping(post);

            // assertions
            makeRequestStub.calledOnce.should.be.false();
            urlService.getUrlByResourceId.calledOnce.should.be.true();
            settingsCacheStub.calledWith('slack_url').should.be.true();
        });

        it('does not send webhook for \'welcome\' post', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'welcome'});
            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            ping(post);

            // assertions
            makeRequestStub.calledOnce.should.be.false();
            urlService.getUrlByResourceId.calledOnce.should.be.true();
            settingsCacheStub.calledWith('slack_url').should.be.true();
        });

        it('handles broken slack settings', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'any'});
            settingsCacheStub.withArgs('slack_url').returns();

            // execute code
            ping(post);

            // assertions
            makeRequestStub.calledOnce.should.be.false();
            urlService.getUrlByResourceId.called.should.be.true();
            settingsCacheStub.calledWith('slack_url').should.be.true();
        });
    });
});
