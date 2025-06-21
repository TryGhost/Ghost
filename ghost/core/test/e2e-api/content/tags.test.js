const assert = require('assert/strict');
const {agentProvider, fixtureManager, matchers, dbUtils} = require('../../utils/e2e-framework');
const {anyContentVersion, anyEtag, anyObjectId} = matchers;

const matchTag = {
    id: anyObjectId
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
                tags: new Array(4).fill(matchTag)
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
            .matchBodySnapshot();
    });

    it('Can use single url field and have valid url fields', async function () {
        await agent
            .get('tags/?fields=url')
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot();
    });
});
