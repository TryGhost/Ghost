const assert = require('node:assert/strict');
const {agentProvider, fixtureManager, matchers, assertions} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyObjectId, anyNumber} = matchers;
const {cacheInvalidateHeaderNotSet} = assertions;
const localUtils = require('./utils');

const authorMatcher = {
    id: anyObjectId
};

const authorMatcherWithCount = {
    ...authorMatcher,
    count: {
        posts: anyNumber
    }
};

describe('Authors Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('owner:post', 'users', 'user:inactive', 'posts', 'api_keys');
        await agent.authenticate();
    });

    it('Can request authors', async function () {
        await agent.get('authors/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                authors: new Array(3).fill(authorMatcher)
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                // We don't expose the email address, status and other attrs.
                localUtils.API.checkResponse(body.authors[0], 'author', ['url'], null, null);

                // Verify default order 'name asc'
                assert.equal(body.authors[0].name, 'Ghost');
                assert.equal(body.authors[2].name, 'Slimer McEctoplasm');

                // Verify URL structure
                const urlParts = new URL(body.authors[0].url);
                assert.ok(['http:', 'https:'].includes(urlParts.protocol));
                assert.equal(urlParts.pathname, `/author/${body.authors[0].slug}/`);
            });
    });
    it('Can request authors including post count', async function () {
        await agent.get('authors/?include=count.posts')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                authors: new Array(3).fill(authorMatcherWithCount)
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                const {authors} = body;
                // We don't expose the email address.
                localUtils.API.checkResponse(body.authors[0], 'author', ['count', 'url'], null, null);

                // Verify slugs and post counts for specific authors
                const mustFind = (slug) => {
                    const expectedAuthor = authors.find(author => author.slug === slug);
                    assert.ok(expectedAuthor, `Expected author slug "${slug}" to be present`);
                    return expectedAuthor;
                };

                assert.equal(mustFind('joe-bloggs').count.posts, 6);
                assert.equal(mustFind('slimer-mcectoplasm').count.posts, 1);
                assert.equal(mustFind('ghost').count.posts, 7);

                // Verify expected author IDs (excluding ghost)
                const nonGhostIds = authors
                    .filter(author => author.slug !== 'ghost')
                    .map(author => author.id);

                assert.deepEqual(nonGhostIds, [
                    fixtureManager.get('users', 0).id,
                    fixtureManager.get('users', 3).id
                ]);
            });
    });
    it('Can request single author', async function () {
        await agent.get(`authors/slug/${fixtureManager.get('users', 0).slug}/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                authors: [authorMatcher]
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                // We don't expose the email address.
                localUtils.API.checkResponse(body.authors[0], 'author', ['url'], null, null);

                assert.equal(body.authors.length, 1);
                const requestedId = fixtureManager.get('users', 0).id;
                assert.equal(body.authors[0].id, requestedId);
            });
    });
    it('Can request author by id including post count', async function () {
        await agent.get(`authors/${fixtureManager.get('users', 0).id}/?include=count.posts`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                authors: [authorMatcherWithCount]
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                // We don't expose the email address.
                localUtils.API.checkResponse(body.authors[0], 'author', ['count', 'url'], null, null);

                assert.equal(body.authors.length, 1);
                const expectedId = fixtureManager.get('users', 0).id;
                assert.equal(body.authors[0].id, expectedId);
            });
    });
});
