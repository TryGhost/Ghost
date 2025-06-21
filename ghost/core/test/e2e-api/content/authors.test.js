const assert = require('assert/strict');
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyString} = matchers;

const matchAuthor = {
    id: anyString
};

describe('Authors Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('owner:post', 'users', 'user:inactive', 'posts', 'api_keys');
        agent.authenticate();
    });

    it('Can request authors', async function () {
        await agent
            .get('authors/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                authors: new Array(3).fill(matchAuthor)
            })
            .expect((res) => {
                const {authors} = res.body;

                // Default order 'name asc' check
                assert.equal(authors[0].name, 'Ghost');
                assert.equal(authors[2].name, 'Slimer McEctoplasm');
            });
    });

    it('Can request authors including post count', async function () {
        await agent
            .get('authors/?include=count.posts&order=count.posts ASC')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                authors: new Array(3).fill(matchAuthor)
            })
            .expect((res) => {
                const {authors} = res.body;

                // Each user should have the correct count
                const joeBloggs = authors.find(a => a.slug === 'joe-bloggs');
                const slimer = authors.find(a => a.slug === 'slimer-mcectoplasm');
                const ghost = authors.find(a => a.slug === 'ghost');

                assert.equal(joeBloggs.count.posts, 4);
                assert.equal(slimer.count.posts, 1);
                assert.equal(ghost.count.posts, 7);

                // Check ordering by count.posts ASC
                assert.equal(authors[0].slug, 'slimer-mcectoplasm');
                assert.equal(authors[2].slug, 'ghost');
            });
    });

    it('Can request single author', async function () {
        await agent
            .get('authors/slug/ghost/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                authors: [matchAuthor]
            });
    });

    it('Can request author by id including post count', async function () {
        await agent
            .get('authors/1/?include=count.posts')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                authors: [matchAuthor]
            });
    });
});
