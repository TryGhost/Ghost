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
                    posts: new Array(11).fill(searchIndexPostMatcher)
                });

            // Explicitely check that expensive fields are not included
            const post = response.body.posts[0];
            assert.equal(post.excerpt, undefined);
            assert.equal(post.html, undefined);
            assert.equal(post.mobiledoc, undefined);
            assert.equal(post.lexical, undefined);
            assert.equal(post.plaintext, undefined);
        });
    });
});
