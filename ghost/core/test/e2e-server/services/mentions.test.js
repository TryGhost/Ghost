const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const sinon = require('sinon');
const nock = require('nock');
const assert = require('assert');
const markdownToMobiledoc = require('../../utils/fixtures/data-generator').markdownToMobiledoc;
const dnsPromises = require('dns').promises;
const jobsService = require('../../../core/server/services/mentions-jobs');

let agent;
let mentionUrl = new URL('https://www.otherghostsite.com/');
let mentionHtml = `Check out this really cool <a href="${mentionUrl.href}">other site</a>.`;
let endpointUrl = new URL('https://www.endpoint.com/');
let targetHtml = `<head><link rel="webmention" href="${endpointUrl.href}"</head><body>Some content</body>`;
let mentionMock;
let endpointMock;

const mentionsPost = {
    title: 'testing sending webmentions',
    mobiledoc: markdownToMobiledoc(mentionHtml)
};

describe('Mentions Service', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsAdmin();
        nock.disableNetConnect(); // make sure we don't actually send mentions
    });

    beforeEach(async function () {
        // externalRequest does dns lookup; stub to make sure we don't fail with fake domain names
        sinon.stub(dnsPromises, 'lookup').callsFake(function () {
            return Promise.resolve({address: '123.123.123.123'});
        });

        // mock response from website mentioned by post to provide endpoint
        mentionMock = nock(mentionUrl.href)
            .get('/')
            .reply(200, targetHtml, {'content-type': 'text/html'});

        // mock response from mention endpoint, usually 201, sometimes 202
        endpointMock = nock(endpointUrl.href)
            .post('/')
            .reply(201);
    });

    afterEach(async function () {
        mockManager.restore();
        nock.cleanAll();
    });

    after(function () {
        nock.enableNetConnect();
        nock.cleanAll();
    });

    describe('Sending Service', function () {
        describe(`does not send when we expect it to not send`, function () {
            it('New draft post created', async function () {
                let publishedPost = {status: 'draft', ...mentionsPost};
                await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                assert.equal(mentionMock.isDone(), false);
                assert.equal(endpointMock.isDone(), false);
            });

            it('Email only post published', async function () {
                let publishedPost = {status: 'published', email_only: true, ...mentionsPost};
                await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                assert.equal(mentionMock.isDone(), false);
                assert.equal(endpointMock.isDone(), false);
            });

            it('Post without content', async function () {
                let publishedPost = {status: 'published', mobiledoc: markdownToMobiledoc(''), title: 'empty post'};
                await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                assert.equal(mentionMock.isDone(), false);
                assert.equal(endpointMock.isDone(), false);
            });
        });

        describe(`does send when we expect it to send`, function () {
            it('Newly published post (post.published)', async function () {
                let sendWebmentionsJob = jobsService.awaitCompletion('sendWebmentions');

                let publishedPost = {status: 'published', ...mentionsPost};
                await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                await sendWebmentionsJob;

                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);
            });

            it('Edited published post (post.published.edited)', async function () {
                let sendWebmentionsJob = jobsService.awaitCompletion('sendWebmentions');
                let publishedPost = {status: 'published', ...mentionsPost};
                let res = await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                await sendWebmentionsJob;

                // while not the point of the test, we should have real links/mentions to start with
                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);

                // reset mocks for mention
                sendWebmentionsJob = jobsService.awaitCompletion('sendWebmentions');
                let mentionMockTwo = nock(mentionUrl.href)
                    .get('/')
                    .reply(200, targetHtml, {'content-type': 'text/html'});
                let endpointMockTwo = nock(endpointUrl.href)
                    .post('/')
                    .reply(201);

                let postId = res.body.posts[0].id;
                let editedPost = {
                    mobiledoc: markdownToMobiledoc(mentionHtml + 'More content'),
                    updated_at: res.body.posts[0].updated_at
                };

                await agent.put(`posts/${postId}/`)
                    .body({posts: [editedPost]})
                    .expectStatus(200);

                await sendWebmentionsJob;

                assert.equal(mentionMockTwo.isDone(), true);
                assert.equal(endpointMockTwo.isDone(), true);
            });
            
            it('Unpublished post (post.unpublished)', async function () {
                let sendWebmentionsJob = jobsService.awaitCompletion('sendWebmentions');
                let publishedPost = {status: 'published', ...mentionsPost};
                let res = await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                await sendWebmentionsJob;

                // while not the point of the test, we should have real links/mentions to start with
                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);

                // reset mocks for mention
                sendWebmentionsJob = jobsService.awaitCompletion('sendWebmentions');
                let mentionMockTwo = nock(mentionUrl.href)
                    .get('/')
                    .reply(200, targetHtml, {'content-type': 'text/html'});
                let endpointMockTwo = nock(endpointUrl.href)
                    .post('/')
                    .reply(201);

                let postId = res.body.posts[0].id;
                // moving back to draft is how we unpublish
                let unpublishedPost = {
                    status: 'draft', 
                    updated_at: res.body.posts[0].updated_at
                };
                await agent.put(`posts/${postId}/`)
                    .body({posts: [unpublishedPost]})
                    .expectStatus(200);

                await sendWebmentionsJob;

                assert.equal(mentionMockTwo.isDone(), true);
                assert.equal(endpointMockTwo.isDone(), true);
            });

            it('Sends for links that got removed from a post', async function () {
                let sendWebmentionsJob = jobsService.awaitCompletion('sendWebmentions');
                let publishedPost = {status: 'published', ...mentionsPost};
                let res = await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                await sendWebmentionsJob;

                // while not the point of the test, we should have real links/mentions to start with
                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);

                // reset mocks for mention
                sendWebmentionsJob = jobsService.awaitCompletion('sendWebmentions');
                let mentionMockTwo = nock(mentionUrl.href)
                    .get('/')
                    .reply(200, targetHtml, {'content-type': 'text/html'});
                let endpointMockTwo = nock(endpointUrl.href)
                    .post('/')
                    .reply(201);

                let postId = res.body.posts[0].id;
                let editedPost = {
                    mobiledoc: markdownToMobiledoc(`mentions were removed from this post`),
                    updated_at: res.body.posts[0].updated_at
                };
                await agent.put(`posts/${postId}/`)
                    .body({posts: [editedPost]})
                    .expectStatus(200);

                await sendWebmentionsJob;

                assert.equal(mentionMockTwo.isDone(), true);
                assert.equal(endpointMockTwo.isDone(), true);
            });

            // there's no special handling for this atm, but could be down the road
            it('New paid post', async function () {
                let sendWebmentionsJob = jobsService.awaitCompletion('sendWebmentions');
                let publishedPost = {status: 'published', visibility: 'paid', ...mentionsPost};
                await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                await sendWebmentionsJob;

                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);
            });
        });
    });
});