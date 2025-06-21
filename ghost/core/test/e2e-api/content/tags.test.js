const assert = require('assert/strict');
const {agentProvider, fixtureManager, matchers, dbUtils} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyNumber, anyString, nullable} = matchers;

const matchTag = {
    id: anyString, // Can be ObjectId or simple ID
    name: anyString,
    slug: anyString,
    description: nullable(anyString),
    feature_image: nullable(anyString),
    visibility: anyString,
    og_image: nullable(anyString),
    og_title: nullable(anyString),
    og_description: nullable(anyString),
    twitter_image: nullable(anyString),
    twitter_title: nullable(anyString),
    twitter_description: nullable(anyString),
    meta_title: nullable(anyString),
    meta_description: nullable(anyString),
    codeinjection_head: nullable(anyString),
    codeinjection_foot: nullable(anyString),
    canonical_url: nullable(anyString),
    accent_color: nullable(anyString),
    url: anyString
};

const matchTagWithCount = {
    ...matchTag,
    count: {
        posts: anyNumber
    }
};

describe('Tags Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('users', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
        agent.authenticate();
    });

    it('Can request tags', async function () {
        await agent
            .get('tags/')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                tags: new Array(4).fill(matchTag)
            })
            .expect((res) => {
                const {tags} = res.body;

                // Default order 'name asc' check
                // the ordering difference is described in https://github.com/TryGhost/Ghost/issues/6104
                if (dbUtils.isMySQL()) {
                    assert.equal(tags[0].name, 'bacon');
                    assert.equal(tags[3].name, 'kitchen sink');
                } else {
                    assert.equal(tags[0].name, 'Getting Started');
                    assert.equal(tags[3].name, 'kitchen sink');
                }
            });
    });

    it('Can request tags with limit=all', async function () {
        await agent
            .get('tags/?limit=all')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                tags: new Array(4).fill(matchTag)
            });
    });

    it('Can limit tags to receive', async function () {
        await agent
            .get('tags/?limit=3')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                tags: new Array(3).fill(matchTag)
            });
    });

    it('Can include post count', async function () {
        await agent
            .get('tags/?include=count.posts')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                tags: new Array(4).fill(matchTagWithCount)
            })
            .expect((res) => {
                const {tags} = res.body;

                // Each tag should have the correct count
                const getTagByName = name => tags.find(t => t.name === name);

                assert.equal(getTagByName('Getting Started').count.posts, 7);
                assert.equal(getTagByName('kitchen sink').count.posts, 2);
                assert.equal(getTagByName('bacon').count.posts, 2);
                assert.equal(getTagByName('chorizo').count.posts, 1);
            });
    });

    it('Can use multiple fields and have valid url fields', async function () {
        await agent
            .get('tags/?fields=url,name')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                tags: new Array(4).fill({
                    name: anyString,
                    url: anyString
                })
            })
            .expect((res) => {
                const {tags} = res.body;

                const getTag = name => tags.find(tag => tag.name === name);

                assert(getTag('Getting Started').url.endsWith('/tag/getting-started/'));
                assert(getTag('kitchen sink').url.endsWith('/tag/kitchen-sink/'));
                assert(getTag('bacon').url.endsWith('/tag/bacon/'));
                assert(getTag('chorizo').url.endsWith('/tag/chorizo/'));
            });
    });

    it('Can use single url field and have valid url fields', async function () {
        await agent
            .get('tags/?fields=url')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                tags: new Array(4).fill({
                    url: anyString
                })
            })
            .expect((res) => {
                const {tags} = res.body;

                const getTag = path => tags.find(tag => tag.url.endsWith(path));

                assert(getTag('/tag/getting-started/'));
                assert(getTag('/tag/kitchen-sink/'));
                assert(getTag('/tag/bacon/'));
                assert(getTag('/tag/chorizo/'));
            });
    });
});
