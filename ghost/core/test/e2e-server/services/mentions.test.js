const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const nock = require('nock');
const assert = require('assert/strict');
const markdownToMobiledoc = require('../../utils/fixtures/data-generator').markdownToMobiledoc;
const jobsService = require('../../../core/server/services/mentions-jobs');

let agent;
let mentionUrl = new URL('https://www.otherghostsite.com/');
let mentionUrl2 = new URL('https://www.otherghostsite2.com/');
let mentionHtml = `Check out this really cool <a href="${mentionUrl.href}">other site</a>.`;
let mentionHtml2 = `Check out this really cool <a href="${mentionUrl2.href}">other site</a>.`;
let endpointUrl = new URL('https://www.endpoint.com/');
let endpointUrl2 = new URL('https://www.endpoint2.com/');
let targetHtml = `<head><link rel="webmention" href="${endpointUrl.href}"</head><body>Some content</body>`;
let targetHtml2 = `<head><link rel="webmention" href="${endpointUrl2.href}"</head><body>Some content</body>`;
let mentionMock;
let endpointMock;
const DomainEvents = require('@tryghost/domain-events');

const mentionsPost = {
    title: 'testing sending webmentions',
    mobiledoc: markdownToMobiledoc(mentionHtml)
};

const editedMentionsPost = {
    title: 'testing sending webmentions',
    mobiledoc: markdownToMobiledoc(mentionHtml2)
};

function addMentionMocks() {
    // mock response from website mentioned by post to provide endpoint
    mentionMock = nock(mentionUrl.href)
        .persist()
        .get('/')
        .reply(200, targetHtml, {'content-type': 'text/html'});

    // mock response from mention endpoint, usually 201, sometimes 202
    endpointMock = nock(endpointUrl.href)
        .persist()
        .post('/')
        .reply(201);
}

describe('Mentions Service', function () {
    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users');
        await agent.loginAsAdmin();
    });

    beforeEach(async function () {
        // externalRequest does dns lookup; stub to make sure we don't fail with fake domain names
        mockManager.disableNetwork();

        // mock response from website mentioned by post to provide endpoint
        addMentionMocks();

        await jobsService.allSettled();
        await DomainEvents.allSettled();
    });

    afterEach(async function () {
        mockManager.restore();
    });

    describe('Sending Service', function () {
        describe(`does not send when we expect it to not send`, function () {
            it('New draft post created', async function () {
                const draftPost = {status: 'draft', ...mentionsPost};
                await agent
                    .post('posts/')
                    .body({posts: [draftPost]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMock.isDone(), false);
                assert.equal(endpointMock.isDone(), false);
            });

            it('Email only post published', async function () {
                const publishedPost = {status: 'published', email_only: true, ...mentionsPost};
                await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMock.isDone(), false);
                assert.equal(endpointMock.isDone(), false);
            });

            it('Post without content', async function () {
                const publishedPost = {status: 'published', mobiledoc: markdownToMobiledoc(''), title: 'empty post'};
                await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMock.isDone(), false);
                assert.equal(endpointMock.isDone(), false);
            });

            it('New draft page created', async function () {
                const draftPage = {status: 'draft', ...mentionsPost};
                await agent
                    .post('pages/')
                    .body({pages: [draftPage]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMock.isDone(), false);
                assert.equal(endpointMock.isDone(), false);
            });
        });

        describe(`does send when we expect it to send`, function () {
            it('Newly published post (post.published)', async function () {
                let publishedPost = {status: 'published', ...mentionsPost};
                await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);
            });

            it('Does not send for edited post without url changes (post.published.edited)', async function () {
                const publishedPost = {status: 'published', ...mentionsPost};
                const res = await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                // while not the point of the test, we should have real links/mentions to start with
                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);

                nock.cleanAll();
                addMentionMocks();
                assert.equal(mentionMock.isDone(), false, 'should be reset');
                assert.equal(endpointMock.isDone(), false, 'should be reset');

                const postId = res.body.posts[0].id;
                const editedPost = {
                    mobiledoc: markdownToMobiledoc(mentionHtml + 'More content'),
                    updated_at: res.body.posts[0].updated_at
                };

                await agent.put(`posts/${postId}/`)
                    .body({posts: [editedPost]})
                    .expectStatus(200);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMock.isDone(), false);
                assert.equal(endpointMock.isDone(), false);
            });

            it('Does send for edited post with url changes (post.published.edited)', async function () {
                const publishedPost = {status: 'published', ...mentionsPost};
                const res = await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                // while not the point of the test, we should have real links/mentions to start with
                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);

                nock.cleanAll();
                addMentionMocks();
                assert.equal(mentionMock.isDone(), false, 'should be reset');
                assert.equal(endpointMock.isDone(), false, 'should be reset');

                // reset mocks for mention
                const mentionMockTwo = nock(mentionUrl2.href)
                    .persist()
                    .get('/')
                    .reply(200, targetHtml2, {'content-type': 'text/html'});

                const endpointMockTwo = nock(endpointUrl2.href)
                    .persist()
                    .post('/')
                    .reply(201);

                const postId = res.body.posts[0].id;
                const editedPost = {
                    ...editedMentionsPost,
                    updated_at: res.body.posts[0].updated_at
                };

                await agent.put(`posts/${postId}/`)
                    .body({posts: [editedPost]})
                    .expectStatus(200);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMockTwo.isDone(), true);
                assert.equal(endpointMockTwo.isDone(), true);

                // Also send again to the deleted url
                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);
            });

            it('Unpublished post (post.unpublished)', async function () {
                const publishedPost = {status: 'published', ...mentionsPost};
                const res = await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                // while not the point of the test, we should have real links/mentions to start with
                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);

                nock.cleanAll();

                // reset mocks for mention
                const mentionMockTwo = nock(mentionUrl.href)
                    .persist()
                    .get('/')
                    .reply(200, targetHtml, {'content-type': 'text/html'});
                const endpointMockTwo = nock(endpointUrl.href)
                    .persist()
                    .post('/')
                    .reply(201);

                const postId = res.body.posts[0].id;
                // moving back to draft is how we unpublish
                const unpublishedPost = {
                    status: 'draft',
                    updated_at: res.body.posts[0].updated_at
                };
                await agent.put(`posts/${postId}/`)
                    .body({posts: [unpublishedPost]})
                    .expectStatus(200);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMockTwo.isDone(), true);
                assert.equal(endpointMockTwo.isDone(), true);
            });

            it('Newly published page (page.published)', async function () {
                let publishedPage = {status: 'published', ...mentionsPost};
                await agent
                    .post('pages/')
                    .body({pages: [publishedPage]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);
            });

            it('Edited published page without url changes (page.published.edited)', async function () {
                const publishedPage = {status: 'published', ...mentionsPost};
                const res = await agent
                    .post('pages/')
                    .body({pages: [publishedPage]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                // while not the point of the test, we should have real links/mentions to start with
                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);

                nock.cleanAll();
                addMentionMocks();
                assert.equal(mentionMock.isDone(), false, 'should be reset');
                assert.equal(endpointMock.isDone(), false, 'should be reset');

                const pageId = res.body.pages[0].id;
                const editedPage = {
                    mobiledoc: markdownToMobiledoc(mentionHtml + 'More content'),
                    updated_at: res.body.pages[0].updated_at
                };

                await agent.put(`pages/${pageId}/`)
                    .body({pages: [editedPage]})
                    .expectStatus(200);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMock.isDone(), false);
                assert.equal(mentionMock.isDone(), false);
            });

            it('Edited published page with url changes (page.published.edited)', async function () {
                const publishedPage = {status: 'published', ...mentionsPost};
                const res = await agent
                    .post('pages/')
                    .body({pages: [publishedPage]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                // while not the point of the test, we should have real links/mentions to start with
                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);

                nock.cleanAll();
                addMentionMocks();
                assert.equal(mentionMock.isDone(), false, 'should be reset');
                assert.equal(endpointMock.isDone(), false, 'should be reset');

                // reset mocks for mention
                const mentionMockTwo = nock(mentionUrl2.href)
                    .persist()
                    .get('/')
                    .reply(200, targetHtml2, {'content-type': 'text/html'});

                const endpointMockTwo = nock(endpointUrl2.href)
                    .persist()
                    .post('/')
                    .reply(201);

                const pageId = res.body.pages[0].id;
                const editedPage = {
                    ...editedMentionsPost,
                    updated_at: res.body.pages[0].updated_at
                };

                await agent.put(`pages/${pageId}/`)
                    .body({pages: [editedPage]})
                    .expectStatus(200);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMockTwo.isDone(), true);
                assert.equal(endpointMockTwo.isDone(), true);

                // Also send again to the deleted url
                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);
            });

            it('Unpublished page (page.unpublished)', async function () {
                const publishedPage = {status: 'published', ...mentionsPost};
                const res = await agent
                    .post('pages/')
                    .body({pages: [publishedPage]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                // while not the point of the test, we should have real links/mentions to start with
                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);

                nock.cleanAll();

                // reset mocks for mention
                const mentionMockTwo = nock(mentionUrl.href)
                    .persist()
                    .get('/')
                    .reply(200, targetHtml, {'content-type': 'text/html'});
                const endpointMockTwo = nock(endpointUrl.href)
                    .persist()
                    .post('/')
                    .reply(201);

                const pageId = res.body.pages[0].id;
                // moving back to draft is how we unpublish
                const unpublishedPage = {
                    status: 'draft',
                    updated_at: res.body.pages[0].updated_at
                };
                await agent.put(`pages/${pageId}/`)
                    .body({pages: [unpublishedPage]})
                    .expectStatus(200);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMockTwo.isDone(), true);
                assert.equal(endpointMockTwo.isDone(), true);
            });

            it('Sends for links that got removed from a post', async function () {
                const publishedPost = {status: 'published', ...mentionsPost};
                const res = await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                // while not the point of the test, we should have real links/mentions to start with
                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);

                nock.cleanAll();

                // reset mocks for mention
                const mentionMockTwo = nock(mentionUrl.href)
                    .persist()
                    .get('/')
                    .reply(200, targetHtml, {'content-type': 'text/html'});

                const endpointMockTwo = nock(endpointUrl.href)
                    .persist()
                    .post('/')
                    .reply(201);

                const postId = res.body.posts[0].id;
                const editedPost = {
                    mobiledoc: markdownToMobiledoc(`mentions were removed from this post`),
                    updated_at: res.body.posts[0].updated_at
                };
                await agent.put(`posts/${postId}/`)
                    .body({posts: [editedPost]})
                    .expectStatus(200);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMockTwo.isDone(), true);
                assert.equal(endpointMockTwo.isDone(), true);
            });

            it('Sends for links that got removed from a page', async function () {
                const publishedPage = {status: 'published', ...mentionsPost};
                const res = await agent
                    .post('pages/')
                    .body({pages: [publishedPage]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                // while not the point of the test, we should have real links/mentions to start with
                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);

                nock.cleanAll();

                // reset mocks for mention
                const mentionMockTwo = nock(mentionUrl.href)
                    .persist()
                    .get('/')
                    .reply(200, targetHtml, {'content-type': 'text/html'});

                const endpointMockTwo = nock(endpointUrl.href)
                    .persist()
                    .post('/')
                    .reply(201);

                const pageId = res.body.pages[0].id;
                const editedPage = {
                    mobiledoc: markdownToMobiledoc(`mentions were removed from this post`),
                    updated_at: res.body.pages[0].updated_at
                };
                await agent.put(`pages/${pageId}/`)
                    .body({pages: [editedPage]})
                    .expectStatus(200);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMockTwo.isDone(), true);
                assert.equal(endpointMockTwo.isDone(), true);
            });

            // there's no special handling for this atm, but could be down the road
            it('New paid post', async function () {
                const publishedPost = {status: 'published', visibility: 'paid', ...mentionsPost};
                await agent
                    .post('posts/')
                    .body({posts: [publishedPost]})
                    .expectStatus(201);

                await jobsService.allSettled();
                await DomainEvents.allSettled();

                assert.equal(mentionMock.isDone(), true);
                assert.equal(endpointMock.isDone(), true);
            });
        });
    });
});
