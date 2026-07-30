const assert = require('node:assert/strict');
const sinon = require('sinon');
const _ = require('lodash');
const nock = require('nock');
const testUtils = require('../../../../utils');
const request = require('@tryghost/request');
const {SlackPingService} = require('../../../../../core/server/services/slack-ping/slack-ping-service');

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

// Build a SlackPingService with fully injected fakes. The real @tryghost/request
// is injected so nock intercepts at the HTTP layer, exactly as before - only the
// stateful/config singletons become injected fakes.
function createService() {
    const settingsCache = {get: sinon.stub()};

    const urlService = {
        facade: {
            getUrlForResource: sinon.stub()
        }
    };

    const urlUtils = {urlFor: sinon.stub().returns(null)};

    const blogIcon = {getIconUrl: sinon.stub().returns('http://myblog.com/favicon.ico')};

    const logging = {info: sinon.stub(), warn: sinon.stub(), error: sinon.stub()};

    // Chainable so `events.removeListener(...).on(...)` works.
    const events = {removeListener: sinon.stub().returnsThis(), on: sinon.stub().returnsThis()};

    const deps = {blogIcon, events, logging, request, settingsCache, urlService, urlUtils};
    const service = new SlackPingService(deps);

    return {service, deps};
}

function createPostModel(post, authors = [], tags = []) {
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

                    if (relation === 'tags') {
                        return tags;
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

describe('Slack Ping', function () {
    afterEach(function () {
        sinon.restore();
        nock.cleanAll();
    });

    describe('subscribeEvents()', function () {
        it('registers listeners for post.published and slack.test', function () {
            const {service, deps} = createService();

            service.subscribeEvents();

            sinon.assert.calledTwice(deps.events.on);
            sinon.assert.calledWith(deps.events.on, 'post.published', service.postListener);
            sinon.assert.calledWith(deps.events.on, 'slack.test', service.testListener);
        });
    });

    describe('handlePostEvent()', function () {
        it('sends a ping with toJSONified model and related authors and tags', async function () {
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
            const testAuthor = _.clone(testUtils.DataGenerator.Content.users[0]);
            const testTag = _.clone(testUtils.DataGenerator.Content.tags[0]);
            const {service, deps} = createService();
            const {requests, scope} = mockSlackWebhook();

            deps.settingsCache.get.withArgs('slack_url').returns(slackURL);
            deps.urlService.facade.getUrlForResource
                .withArgs(sinon.match({id: testPost.id, type: 'posts'}), {absolute: true})
                .returns('http://myblog.com/' + testPost.slug + '/');
            deps.urlService.facade.getUrlForResource
                .withArgs(sinon.match({id: testAuthor.id, type: 'authors'}), {absolute: true})
                .returns('http://myblog.com/author/' + testAuthor.slug + '/');

            service.handlePostEvent(createPostModel(testPost, [testAuthor], [testTag]));

            await waitFor(() => scope.isDone());

            assert.equal(scope.isDone(), true);
            assert.equal(requests[0].attachments[1].fields[0].value, `<http://myblog.com/author/${testAuthor.slug}/ | ${testAuthor.name}>`);
            // tags must reach the URL service so the lazy backend can evaluate
            // collection filters like `tag:foo` when resolving the post URL
            sinon.assert.calledWith(
                deps.urlService.facade.getUrlForResource,
                sinon.match({id: testPost.id, type: 'posts', tags: [testTag]}),
                {absolute: true}
            );
        });

        it('does not call ping() when importing', function () {
            const testPost = _.clone(testUtils.DataGenerator.Content.posts[2]);
            const {service, deps} = createService();
            const {scope} = mockSlackWebhook();

            deps.settingsCache.get.withArgs('slack_url').returns(slackURL);

            service.handlePostEvent(createPostModel(testPost), {importing: true});

            assert.equal(scope.isDone(), false);
            sinon.assert.notCalled(deps.urlService.facade.getUrlForResource);
        });
    });

    describe('ping()', function () {
        it('makes a request for a post if url is provided', async function () {
            const post = testUtils.DataGenerator.forKnex.createPost({
                slug: 'webhook-test',
                html: `<p>Hello World!</p><p>This is a test post.</p><!--members-only--><p>This is members only content.</p>`
            });
            const {service, deps} = createService();
            const {requests, scope} = mockSlackWebhook();

            deps.settingsCache.get.withArgs('slack_url').returns(slackURL);
            deps.urlService.facade.getUrlForResource
                .withArgs(sinon.match({id: post.id, type: 'posts'}), {absolute: true})
                .returns('http://myblog.com/' + post.slug + '/');

            service.handlePostEvent(createPostModel(post));

            await waitFor(() => scope.isDone());

            assert.equal(scope.isDone(), true);
            sinon.assert.calledOnce(deps.urlService.facade.getUrlForResource);
            sinon.assert.calledWith(deps.settingsCache.get, 'slack_url');

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
            const {service, deps} = createService();
            const {requests, scope} = mockSlackWebhook();

            deps.settingsCache.get.withArgs('slack_url').returns(slackURL);

            service.handleTestEvent();

            await waitFor(() => scope.isDone());

            assert.equal(scope.isDone(), true);
            sinon.assert.notCalled(deps.urlService.facade.getUrlForResource);
            sinon.assert.calledWith(deps.settingsCache.get, 'slack_url');

            const requestData = requests[0];

            assert.equal(requestData.text, 'Heya! This is a test notification from your Ghost blog :smile:. Seems to work fine!');
            assert.equal(requestData.icon_url, 'http://myblog.com/favicon.ico');
            assert.equal(requestData.username, 'Ghost');
            assert.equal(requestData.unfurl_links, true);
        });

        it('makes a request and errors', async function () {
            const {service, deps} = createService();
            const requestScope = nock('https://hooks.slack.com')
                .post(slackURLPath)
                .replyWithError('Slack unavailable');

            deps.settingsCache.get.withArgs('slack_url').returns(slackURL);

            service.handleTestEvent();

            // Bound the poll so a regression fails with a clear assertion
            // below rather than stalling until the suite-wide test timeout.
            await waitFor(() => deps.logging.error.calledOnce);
            assert.equal(requestScope.isDone(), true);
            sinon.assert.calledOnce(deps.logging.error);
        });

        it('does not make a request if post is a page', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({type: 'page'});
            const {service, deps} = createService();
            const {scope} = mockSlackWebhook();

            deps.settingsCache.get.withArgs('slack_url').returns(slackURL);

            service.handlePostEvent(createPostModel(post));

            assert.equal(scope.isDone(), false);
            sinon.assert.calledOnce(deps.urlService.facade.getUrlForResource);
            sinon.assert.calledWith(deps.settingsCache.get, 'slack_url');
        });

        it('does not send webhook for \'welcome\' post', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'welcome'});
            const {service, deps} = createService();
            const {scope} = mockSlackWebhook();

            deps.settingsCache.get.withArgs('slack_url').returns(slackURL);

            service.handlePostEvent(createPostModel(post));

            assert.equal(scope.isDone(), false);
            sinon.assert.calledOnce(deps.urlService.facade.getUrlForResource);
            sinon.assert.calledWith(deps.settingsCache.get, 'slack_url');
        });

        it('handles broken slack settings', function () {
            const post = testUtils.DataGenerator.forKnex.createPost({slug: 'any'});
            const {service, deps} = createService();

            deps.settingsCache.get.withArgs('slack_url').returns();

            service.handlePostEvent(createPostModel(post));

            sinon.assert.called(deps.urlService.facade.getUrlForResource);
            sinon.assert.calledWith(deps.settingsCache.get, 'slack_url');
        });
    });
});
