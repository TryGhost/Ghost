const assert = require('assert/strict');
const {agentProvider, fixtureManager, matchers, assertions} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyObjectId, anyNumber} = matchers;
const {cacheInvalidateHeaderNotSet} = assertions;

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
                // Verify default order 'name asc'
                assert.equal(body.authors[0].name, 'Ghost');
                assert.equal(body.authors[2].name, 'Slimer McEctoplasm');
                
                // Verify URL structure
                const urlParts = new URL(body.authors[0].url);
                assert.equal(urlParts.protocol, 'http:');
                assert.equal(urlParts.host, '127.0.0.1:2369');
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

                // Verify post counts for specific authors
                const getAuthorBySlug = slug => authors.find(author => author.slug === slug);
                
                assert.equal(getAuthorBySlug('joe-bloggs').count.posts, 4);
                assert.equal(getAuthorBySlug('slimer-mcectoplasm').count.posts, 1);
                assert.equal(getAuthorBySlug('ghost').count.posts, 7);
                
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
        await agent.get(`authors/slug/${fixtureManager.get('users', 0).slug}`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                authors: new Array(1).fill(authorMatcher)
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                assert.equal(body.authors.length, 1);
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
                authors: new Array(1).fill(authorMatcherWithCount)
            })
            .expect(cacheInvalidateHeaderNotSet())
            .expect(({body}) => {
                assert.equal(body.authors.length, 1);
            });
    });
});
