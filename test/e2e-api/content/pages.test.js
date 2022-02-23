const assert = require('assert');

const {agentProvider, fixtureManager, matchers} = require('../../utils/e2e-framework');
const {anyEtag, anyUuid, anyDateWithTimezoneOffset} = matchers;

const pageMatcher = {
    published_at: anyDateWithTimezoneOffset,
    created_at: anyDateWithTimezoneOffset,
    updated_at: anyDateWithTimezoneOffset,
    uuid: anyUuid
};

describe('Pages Content API', function () {
    let agent;

    before(async function () {
        agent = await agentProvider.getContentAPIAgent();
        await fixtureManager.init('users:no-owner', 'user:inactive', 'posts', 'tags:extra', 'api_keys');
        agent.authenticate();
    });

    it('Can request pages', async function () {
        const res = await agent.get(`pages/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                pages: new Array(5)
                    .fill(pageMatcher)
            });

        assert.equal(res.body.pages[0].slug, 'about');

        const urlParts = new URL(res.body.pages[0].url);
        assert.equal(urlParts.protocol, 'http:');
        assert.equal(urlParts.host, '127.0.0.1:2369');
    });

    it('Can request page', async function () {
        const res = await agent.get(`pages/${fixtureManager.get('posts', 5).id}/`)
            .expectStatus(200)
            .matchHeaderSnapshot({
                etag: anyEtag
            })
            .matchBodySnapshot({
                pages: new Array(1)
                    .fill(pageMatcher)
            });

        assert.equal(res.body.pages[0].slug, fixtureManager.get('posts', 5).slug);

        const urlParts = new URL(res.body.pages[0].url);
        assert.equal(urlParts.protocol, 'http:');
        assert.equal(urlParts.host, '127.0.0.1:2369');
    });
});
