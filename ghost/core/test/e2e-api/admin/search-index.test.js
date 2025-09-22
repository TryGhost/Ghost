const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyISODateTime, anyString} = matchers;
const assert = require('node:assert');

describe('Search Index API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('posts');
        await agent.loginAsOwner();
    });

    describe('fetchPosts', function () {
        const searchIndexPostMatcher = {
            id: anyString,
            title: anyString,
            url: anyString,
            status: anyString,
            published_at: anyISODateTime,
            visibility: anyString
        };

        it('should return a list of posts', async function () {
            const response = await agent.get('/search-index/posts')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    posts: new Array(13).fill(searchIndexPostMatcher)
                });

            // Explicitly double-check that expensive fields are not included
            const post = response.body.posts[0];
            assert.equal(post.excerpt, undefined);
            assert.equal(post.html, undefined);
            assert.equal(post.mobiledoc, undefined);
            assert.equal(post.lexical, undefined);
            assert.equal(post.plaintext, undefined);
        });
    });

    describe('fetchPages', function () {
        const searchIndexPageMatcher = {
            id: anyString,
            title: anyString,
            url: anyString,
            status: anyString,
            published_at: anyISODateTime,
            visibility: anyString
        };

        it('should return a list of pages', async function () {
            const response = await agent.get('/search-index/pages')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    pages: new Array(6).fill(searchIndexPageMatcher)
                });

            // Explicitly double-check that expensive fields are not included
            const page = response.body.pages[0];
            assert.equal(page.excerpt, undefined);
            assert.equal(page.html, undefined);
            assert.equal(page.mobiledoc, undefined);
            assert.equal(page.lexical, undefined);
            assert.equal(page.plaintext, undefined);
        });
    });

    describe('fetchTags', function () {
        const searchIndexTagMatcher = {
            id: anyString,
            slug: anyString,
            name: anyString,
            url: anyString
        };

        it('should return a list of tags', async function () {
            await agent.get('/search-index/tags')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    tags: new Array(6).fill(searchIndexTagMatcher)
                });
        });
    });

    describe('fetchUsers', function () {
        const searchIndexUserMatcher = {
            id: anyString,
            slug: anyString,
            name: anyString,
            url: anyString,
            profile_image: anyString
        };

        it('should return a list of users', async function () {
            await agent.get('/search-index/users')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    users: new Array(2).fill(searchIndexUserMatcher)
                });
        });
    });
});
