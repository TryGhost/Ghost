import assert from 'node:assert/strict';

const {agentProvider, fixtureManager, mockManager} = require('../../utils/e2e-framework');
const models = require('../../../core/server/models');

describe('Gift Links Admin API', function () {
    let agent: {
        get: (_url: string) => any;
        put: (_url: string) => any;
        post: (_url: string) => any;
        loginAsOwner: () => Promise<void>;
        loginAsContributor: () => Promise<void>;
    };
    let postId: string;
    let pageId: string;

    beforeAll(async function () {
        agent = await agentProvider.getAdminAPIAgent();
        await fixtureManager.init('users', 'posts');
        await agent.loginAsOwner();
        postId = fixtureManager.get('posts', 0).id;
        pageId = (await models.Base.knex('posts').where('type', 'page').first('id')).id;
    });

    beforeEach(function () {
        mockManager.mockLabsEnabled('giftLinks');
    });

    afterEach(async function () {
        mockManager.restore();
        await models.Base.knex('post_gift_links').del();
        await models.Base.knex('gift_links').del();
    });

    // The gift-link API is mounted for both posts and pages off the same controller; exercise
    // both URL shapes so a missing route or a posts-only assumption can't pass unnoticed.
    describe.each([
        {name: 'posts', id: () => postId},
        {name: 'pages', id: () => pageId}
    ])('on $name', function ({name, id}: {name: string, id: () => string}) {
        it('GET returns an empty list when no link exists', async function () {
            const {body} = await agent.get(`${name}/${id()}/gift_link/`).expectStatus(200);
            assert.deepEqual(body, {gift_links: []});
        });

        it('PUT issues the gift link as a token-shaped resource in a list', async function () {
            const {body} = await agent.put(`${name}/${id()}/gift_link/`).expectStatus(200);

            assert.deepEqual(Object.keys(body), ['gift_links']);
            assert.equal(body.gift_links.length, 1);
            // Allow-list — the response exposes only these fields.
            assert.deepEqual(
                Object.keys(body.gift_links[0]).sort(),
                ['created_at', 'last_redeemed_at', 'redeemed_count', 'token']
            );
        });

        it('POST reissues to a fresh token', async function () {
            const first = (await agent.put(`${name}/${id()}/gift_link/`).expectStatus(200)).body.gift_links[0].token;
            const {body} = await agent.post(`${name}/${id()}/gift_link/`).expectStatus(200);

            assert.equal(body.gift_links.length, 1);
            assert.notEqual(body.gift_links[0].token, first);
        });

        it('403s for a role without gift-link permission', async function () {
            await agent.loginAsContributor();
            await agent.get(`${name}/${id()}/gift_link/`).expectStatus(403);
            await agent.loginAsOwner();
        });

        it('supports the full lifecycle', async function () {
            // empty
            let body = (await agent.get(`${name}/${id()}/gift_link/`).expectStatus(200)).body;
            assert.deepEqual(body.gift_links, []);

            // issue
            body = (await agent.put(`${name}/${id()}/gift_link/`).expectStatus(200)).body;
            const first = body.gift_links[0].token;
            assert.ok(first);
            assert.equal(body.gift_links[0].redeemed_count, 0);

            // reissue
            body = (await agent.post(`${name}/${id()}/gift_link/`).expectStatus(200)).body;
            const second = body.gift_links[0].token;
            assert.notEqual(second, first);
            body = (await agent.get(`${name}/${id()}/gift_link/`).expectStatus(200)).body;
            assert.equal(body.gift_links[0].token, second);

            // revoke
            body = (await agent.put('gift_links/revoke_all/').expectStatus(200)).body;
            assert.deepEqual(body, {meta: {count: 1}});
            body = (await agent.get(`${name}/${id()}/gift_link/`).expectStatus(200)).body;
            assert.deepEqual(body.gift_links, []);
        });
    });

    describe('revoke_all', function () {
        it('returns the count in a meta block, not as a resource', async function () {
            await agent.put(`posts/${postId}/gift_link/`).expectStatus(200);
            const {body} = await agent.put('gift_links/revoke_all/').expectStatus(200);
            assert.deepEqual(body, {meta: {count: 1}});
        });
    });

    it('404s when the giftLinks flag is disabled', async function () {
        mockManager.mockLabsDisabled('giftLinks');
        await agent.get(`posts/${postId}/gift_link/`).expectStatus(404);
    });
});
