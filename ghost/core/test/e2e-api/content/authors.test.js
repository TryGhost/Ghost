const assert = require('assert/strict');
const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyNumber, anyString, nullable} = matchers;

const matchAuthor = {
    id: anyString, // Can be ObjectId or simple ID like "1"
    name: anyString,
    slug: anyString,
    profile_image: nullable(anyString),
    cover_image: nullable(anyString),
    bio: anyString,
    website: nullable(anyString),
    location: anyString,
    facebook: nullable(anyString),
    twitter: nullable(anyString),
    bluesky: nullable(anyString),
    instagram: nullable(anyString),
    linkedin: nullable(anyString),
    mastodon: nullable(anyString),
    threads: nullable(anyString),
    tiktok: nullable(anyString),
    youtube: nullable(anyString),
    meta_title: nullable(anyString),
    meta_description: nullable(anyString),
    url: anyString
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
                authors: new Array(3).fill({
                    ...matchAuthor,
                    count: {
                        posts: anyNumber
                    }
                })
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
                authors: [{
                    ...matchAuthor,
                    count: {
                        posts: anyNumber
                    }
                }]
            });
    });
});
