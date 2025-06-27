const assert = require('assert/strict');

const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyISODateTimeWithTZ, anyString} = matchers;

describe('Search Index Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('posts', 'api_keys');
        await agent.authenticate();
    });

    describe('fetchPosts', function () {
        const searchIndexPostMatcher = {
            slug: anyString,
            title: anyString,
            excerpt: anyString,
            url: anyString,
            visibility: anyString,
            published_at: anyISODateTimeWithTZ,
            created_at: anyISODateTimeWithTZ,
            updated_at: anyISODateTimeWithTZ
        };

        it('should return a list of posts', async function () {
            const res = await agent.get('search-index/posts')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    posts: new Array(11)
                        .fill(searchIndexPostMatcher)
                });

            // Explicitely double-check that expensive fields are not included
            const post = res.body.posts[0];
            assert.equal(post.html, undefined, 'html field should be not included in the response');
            assert.equal(post.plaintext, undefined, 'plaintext field should be not included in the response');
            assert.equal(post.mobiledoc, undefined, 'mobiledoc field should be not included in the response');
            assert.equal(post.lexical, undefined, 'lexical field should be not included in the response');
        });
    });

    describe('fetchAuthors', function () {
        const searchIndexAuthorMatcher = {
            slug: anyString,
            name: anyString,
            url: anyString,
            profile_image: anyString
        };

        it('should return a list of authors', async function () {
            await agent.get('search-index/authors')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    authors: new Array(2)
                        .fill(searchIndexAuthorMatcher)
                });
        });
    });
});
