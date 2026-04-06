const assert = require('node:assert/strict');

const models = require('../../../core/server/models');
const context = require('../../utils/fixtures/context');
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
            id: anyString,
            slug: anyString,
            title: anyString,
            excerpt: anyString,
            url: anyString,
            updated_at: anyISODateTimeWithTZ,
            visibility: anyString
        };

        it('should return a list of posts', async function () {
            const res = await agent.get('search-index/posts')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    posts: new Array(13)
                        .fill(searchIndexPostMatcher)
                });

            // Explicitly double-check that expensive fields are not included
            const post = res.body.posts[0];
            assert.equal(post.html, undefined, 'html field should be not included in the response');
            assert.equal(post.plaintext, undefined, 'plaintext field should be not included in the response');
            assert.equal(post.mobiledoc, undefined, 'mobiledoc field should be not included in the response');
            assert.equal(post.lexical, undefined, 'lexical field should be not included in the response');
        });
    });

    describe('fetchAuthors', function () {
        const searchIndexAuthorMatcher = {
            id: anyString,
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

    describe('fetchTags', function () {
        const searchIndexTagMatcher = {
            id: anyString,
            slug: anyString,
            name: anyString,
            url: anyString
        };

        it('should return a list of tags', async function () {
            await agent.get('search-index/tags')
                .expectStatus(200)
                .matchHeaderSnapshot({
                    'content-version': anyContentVersion,
                    etag: anyEtag
                })
                .matchBodySnapshot({
                    tags: new Array(7)
                        .fill(searchIndexTagMatcher)
                });
        });

        it('does not return internal tags', async function () {
            const internalTag = await models.Tag.add({
                name: 'Internal Tag',
                slug: 'internal-tag',
                visibility: 'internal'
            }, context.internal);

            const tags = await agent.get('search-index/tags').expectStatus(200);

            assert.equal(tags.body.tags.find(tag => tag.id === internalTag.id), undefined, 'should not include internal tag');
        });
    });
});
