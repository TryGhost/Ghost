const should = require('should');
const { agentProvider, fixtureManager, matchers } = require('../../utils/e2e-framework');
const { anyContentVersion, anyEtag, anyObjectId, anyNumber } = matchers;

const authorMatcher = {
    id: anyObjectId
};

const authorMatcherWithCount = Object.assign(
    {},
    authorMatcher, {
    count: {
        posts: anyNumber
    }
}
);

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
            });
    });
    it('Can request single author', async function () {
        await agent.get(`authors/slug/${fixtureManager.get('authors', 0).slug}`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                authors: new Array(1).fill(authorMatcher)
            });
    });
    it('Can request author by id including post count', async function () {
        await agent.get(`authors/${fixtureManager.get('authors', 0).id}/?include=count.posts`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                'content-version': anyContentVersion,
                etag: anyEtag
            })
            .matchBodySnapshot({
                authors: new Array(1).fill(authorMatcherWithCount)
            });
    });
});
