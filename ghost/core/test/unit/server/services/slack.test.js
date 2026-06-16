const assert = require('node:assert/strict');
const sinon = require('sinon');
const _ = require('lodash');
const nock = require('nock');
const testUtils = require('../../../utils');
const configUtils = require('../../../utils/config-utils');

// Stuff we test
const slack = require('../../../../core/server/services/slack');

const events = require('../../../../core/server/lib/common/events');
const logging = require('@tryghost/logging');
const imageLib = require('../../../../core/server/lib/image');
const urlService = require('../../../../core/server/services/url');
const settingsCache = require('../../../../core/shared/settings-cache');

// Test data
const slackURL = 'https://hooks.slack.com/services/a-b-c-d';
const slackURLPath = '/services/a-b-c-d';

const wait = ms => new Promise((resolve) => {
    setTimeout(resolve, ms);
});

async function waitFor(assertion, timeout = 1000) {
    const deadline = Date.now() + timeout;

    while (!assertion() && Date.now() < deadline) {
        await wait(50);
    }
}

describe('Slack', function () {
    let eventStub;

    beforeEach(function () {
        eventStub = sinon.stub(events, 'on');
        sinon.stub(events, 'hasRegisteredListener').returns(false);
    });

    afterEach(async function () {
        sinon.restore();
        nock.cleanAll();
        await configUtils.restore();
    });

    function getListeners() {
        slack.listen();

        return {
            slackListener: eventStub.firstCall.args[1],
            slackTestPing: eventStub.secondCall.args[1]
        };
    }

    function createPostModel(post, authors = []) {
        return {
            toJSON: function () {
                return post;
            },
            related: function (relation) {
                return {
                    toJSON: function () {
                        if (relation === 'authors') {
                            return authors;
                        }

                        return [];
                    }
                };
            }
        };
    }

    function mockSlackWebhook() {
        const requests = [];
        const scope = nock('https://hooks.slack.com')
            .post(slackURLPath, (body) => {
                requests.push(typeof body === 'string' ? JSON.parse(body) : body);
                return true;
            })
            .reply(200);

        return {
            requests,
            scope
        };
    }

    it('listen() should initialise event correctly', function () {
        slack.listen();
        sinon.assert.calledTwice(eventStub);
        sinon.assert.calledWith(eventStub.firstCall, 'post.published', sinon.match.func);
        sinon.assert.calledWith(eventStub.secondCall, 'slack.test', sinon.match.func);
        assert.equal(eventStub.firstCall.args[1].name, 'slackListener');
        assert.equal(eventStub.secondCall.args[1].name, 'slackTestPing');
    });

    it('listener() sends a ping with toJSONified model and related authors', async function () {
        const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
        const testAuthor = _.clone(testUtils.DataGenerator.Content.users[0]);
        const settingsCacheStub = sinon.stub(settingsCache, 'get');
        const urlServiceGetUrlForResourceStub = sinon.stub(urlService.facade, 'getUrlForResource');
        const {requests, scope} = mockSlackWebhook();
        const {slackListener} = getListeners();

        settingsCacheStub.withArgs('slack_url').returns(slackURL);
        sinon.stub(imageLib.blogIcon, 'getIconUrl').returns('http://myblog.com/favicon.ico');
        urlServiceGetUrlForResourceStub
            .withArgs(sinon.match({id: testPost.id, type: 'posts'}), {absolute: true})
            .returns('http://myblog.com/' + testPost.slug + '/');
        urlServiceGetUrlForResourceStub
            .withArgs(sinon.match({id: testAuthor.id, type: 'authors'}), {absolute: true})
            .returns('http://myblog.com/author/' + testAuthor.slug + '/');

        configUtils.set('url', 'http://myblog.com');

        slackListener(createPostModel(testPost, [testAuthor]));

        await waitFor(() => scope.isDone());

        assert.equal(scope.isDone(), true);
        assert.equal(requests[0].attachments[1].fields[0].value, `<http://myblog.com/author/${testAuthor.slug}/ | ${testAuthor.name}>`);
    });

    it('listener() does not call ping() when importing', function () {
        const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
        const settingsCacheStub = sinon.stub(settingsCache, 'get');
        const urlServiceGetUrlForResourceStub = sinon.stub(urlService.facade, 'getUrlForResource');
        const {scope} = mockSlackWebhook();
        const {slackListener} = getListeners();

        settingsCacheStub.withArgs('slack_url').returns(slackURL);

        slackListener(createPostModel(testPost), {importing: true});

        assert.equal(scope.isDone(), false);
        sinon.assert.notCalled(urlServiceGetUrlForResourceStub);
    });

    describe('ping()', function () {
        let settingsCacheStub;
        let urlServiceGetUrlForResourceStub;
        let listeners;

        beforeEach(function () {
            urlServiceGetUrlForResourceStub = sinon.stub(urlService.facade, 'getUrlForResource');

            settingsCacheStub = sinon.stub(settingsCache, 'get');

            sinon.stub(imageLib.blogIcon, 'getIconUrl').returns('http://myblog.com/favicon.ico');

            configUtils.set('url', 'http://myblog.com');
            listeners = getListeners();
        });

        it('makes a request for a post if url is provided', async function () {
            const post = testUtils.DataGenerator.forKnex.createPost({
                slug: 'webhook-test',
                html: `<p>Hello World!</p><p>This is a test post.</p><!--members-only--><p>This is members only content.</p>`
            });
            const {requests, scope} = mockSlackWebhook();
            urlServiceGetUrlForResourceStub
                .withArgs(sinon.match({id: post.id, type: 'posts'}), {absolute: true})
                .returns('http://myblog.com/' + post.slug + '/');

            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            listeners.slackListener(createPostModel(post));

            await waitFor(() => scope.isDone());

            // assertions
            assert.equal(scope.isDone(), true);
            sinon.assert.calledOnce(urlServiceGetUrlForResourceStub);
            sinon.assert.calledWith(settingsCacheStub, 'slack_url');

            const requestData = requests[0];

            assert.equal(requestData.attachments[0].title, post.title);
            assert.equal(requestData.attachments[0].title_link, 'http://myblog.com/webhook-test/');
            assert.equal(requestData.attachments[0].fields[0].value, 'Hello World!This is a test post.');
            assert(!('author_name' in requestData.attachments[0]));
            assert.equal(requestData.icon_url, 'http://myblog.com/favicon.ico');

            assert.equal(requestData.username, 'Ghost');
            assert.equal(requestData.unfurl_links, true);
        });

        it('makes a request for a test message if url is provided', async function () {
            const {requests, scope} = mockSlackWebhook();
            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            listeners.slackTestPing();

            await waitFor(() => scope.isDone());

            // assertions
            assert.equal(scope.isDone(), true);
            sinon.assert.notCalled(urlServiceGetUrlForResourceStub);
            sinon.assert.calledWith(settingsCacheStub, 'slack_url');

            const requestData = requests[0];

            assert.equal(requestData.text, 'Heya! This is a test notification from your Ghost blog :smile:. Seems to work fine!');
            assert.equal(requestData.icon_url, 'http://myblog.com/favicon.ico');
            assert.equal(requestData.username, 'Ghost');
            assert.equal(requestData.unfurl_links, true);
        });

        it('makes a request and errors', async function () {
            const loggingStub = sinon.stub(logging, 'error');
            const requestScope = nock('https://hooks.slack.com')
                .post(slackURLPath)
                .replyWithError('Slack unavailable');
            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            listeners.slackTestPing();

            // Bound the poll so a regression fails with a clear assertion
            // below rather than stalling until the suite-wide test timeout.
            await waitFor(() => loggingStub.calledOnce);
            assert.equal(requestScope.isDone(), true);
            sinon.assert.calledOnce(loggingStub);
        });

        it('does not make a request if post is a page', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({type: 'page'});
            const {scope} = mockSlackWebhook();
            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            listeners.slackListener(createPostModel(post));

            // assertions
            assert.equal(scope.isDone(), false);
            sinon.assert.calledOnce(urlServiceGetUrlForResourceStub);
            sinon.assert.calledWith(settingsCacheStub, 'slack_url');
        });

        it('does not send webhook for \'welcome\' post', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'welcome'});
            const {scope} = mockSlackWebhook();
            settingsCacheStub.withArgs('slack_url').returns(slackURL);

            // execute code
            listeners.slackListener(createPostModel(post));

            // assertions
            assert.equal(scope.isDone(), false);
            sinon.assert.calledOnce(urlServiceGetUrlForResourceStub);
            sinon.assert.calledWith(settingsCacheStub, 'slack_url');
        });

        it('handles broken slack settings', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'any'});
            settingsCacheStub.withArgs('slack_url').returns();

            // execute code
            listeners.slackListener(createPostModel(post));

            // assertions
            sinon.assert.called(urlServiceGetUrlForResourceStub);
            sinon.assert.calledWith(settingsCacheStub, 'slack_url');
        });
    });
});
