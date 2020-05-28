const sinon = require('sinon');
const _ = require('lodash');
const rewire = require('rewire');
const testUtils = require('../../utils');
const configUtils = require('../../utils/configUtils');

// Stuff we test
const slack = rewire('../../../core/server/services/slack');

const {events} = require('../../../core/server/lib/common');
const logging = require('../../../core/shared/logging');
const imageLib = require('../../../core/server/lib/image');
const urlService = require('../../../core/frontend/services/url');
const schema = require('../../../core/server/data/schema').checks;
const settingsCache = require('../../../core/server/services/settings/cache');

// Test data
const slackObjNoUrl = [{url: ''}];

const slackObjWithUrl = [{url: 'https://hooks.slack.com/services/a-b-c-d'}];

describe('Slack', function () {
    let eventStub;

    beforeEach(function () {
        eventStub = sinon.stub(events, 'on');
    });

    afterEach(function () {
        sinon.restore();
        configUtils.restore();
    });

    it('listen() should initialise event correctly', function () {
        slack.listen();
        eventStub.calledTwice.should.be.true();
        eventStub.firstCall.calledWith('post.published', slack.__get__('listener')).should.be.true();
        eventStub.secondCall.calledWith('slack.test', slack.__get__('testPing')).should.be.true();
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
        const listener = slack.__get__('listener');

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
        const listener = slack.__get__('listener');

        listener(testModel, {importing: true});

        pingStub.calledOnce.should.be.false();

        // Reset slack ping method
        resetSlack();
    });

    it('testPing() calls ping() with default message', function () {
        const pingStub = sinon.stub();
        const resetSlack = slack.__set__('ping', pingStub);
        const testPing = slack.__get__('testPing');

        testPing();

        pingStub.calledOnce.should.be.true();
        pingStub.calledWith(sinon.match.has('message')).should.be.true();

        // Reset slack ping method
        resetSlack();
    });

    describe('ping()', function () {
        let isPostStub;
        let settingsCacheStub;
        let slackReset;
        let makeRequestStub;
        const ping = slack.__get__('ping');

        beforeEach(function () {
            isPostStub = sinon.stub(schema, 'isPost');
            sinon.stub(urlService, 'getUrlByResourceId');

            settingsCacheStub = sinon.stub(settingsCache, 'get');
            sinon.spy(logging, 'error');

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

            isPostStub.returns(true);
            settingsCacheStub.withArgs('slack').returns(slackObjWithUrl);

            // execute code
            ping(post);

            // assertions
            makeRequestStub.calledOnce.should.be.true();
            isPostStub.calledTwice.should.be.true();
            urlService.getUrlByResourceId.calledOnce.should.be.true();
            settingsCacheStub.calledWith('slack').should.be.true();

            requestUrl = makeRequestStub.firstCall.args[0];
            requestData = JSON.parse(makeRequestStub.firstCall.args[1].body);

            requestUrl.should.equal(slackObjWithUrl[0].url);
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

            isPostStub.returns(false);
            settingsCacheStub.withArgs('slack').returns(slackObjWithUrl);

            // execute code
            ping({message: 'Hi!'});

            // assertions
            makeRequestStub.calledOnce.should.be.true();
            isPostStub.calledTwice.should.be.true();
            urlService.getUrlByResourceId.called.should.be.false();
            settingsCacheStub.calledWith('slack').should.be.true();

            requestUrl = makeRequestStub.firstCall.args[0];
            requestData = JSON.parse(makeRequestStub.firstCall.args[1].body);

            requestUrl.should.equal(slackObjWithUrl[0].url);
            requestData.text.should.equal('Hi!');
            requestData.icon_url.should.equal('http://myblog.com/favicon.ico');
            requestData.username.should.equal('Ghost');
            requestData.unfurl_links.should.equal(true);
        });

        it('makes a request and errors', function (done) {
            makeRequestStub.rejects();
            settingsCacheStub.withArgs('slack').returns(slackObjWithUrl);

            // execute code
            ping({});

            (function retry() {
                if (logging.error.calledOnce) {
                    makeRequestStub.calledOnce.should.be.true();
                    return done();
                }

                setTimeout(retry, 50);
            }());
        });

        it('does not make a request if post is a page', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({type: 'page'});
            isPostStub.returns(true);
            settingsCacheStub.withArgs('slack').returns(slackObjWithUrl);

            // execute code
            ping(post);

            // assertions
            makeRequestStub.calledOnce.should.be.false();
            isPostStub.calledOnce.should.be.true();
            urlService.getUrlByResourceId.calledOnce.should.be.true();
            settingsCacheStub.calledWith('slack').should.be.true();
        });

        it('does not send webhook for \'welcome\' post', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'welcome'});
            isPostStub.returns(true);
            settingsCacheStub.withArgs('slack').returns(slackObjWithUrl);

            // execute code
            ping(post);

            // assertions
            makeRequestStub.calledOnce.should.be.false();
            isPostStub.calledOnce.should.be.true();
            urlService.getUrlByResourceId.calledOnce.should.be.true();
            settingsCacheStub.calledWith('slack').should.be.true();
        });

        it('handles broken slack settings', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'any'});
            settingsCacheStub.withArgs('slack').returns();

            // execute code
            ping(post);

            // assertions
            makeRequestStub.calledOnce.should.be.false();
            isPostStub.calledOnce.should.be.true();
            urlService.getUrlByResourceId.called.should.be.false();
            settingsCacheStub.calledWith('slack').should.be.true();
        });
    });
});
